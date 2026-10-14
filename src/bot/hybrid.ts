import { applyMove, getLegalMoves, turn } from '../engine/game';
import { engineFen } from '../engine/boardValidator';
import type { ImmortalChessState, MoveInput } from '../engine/types';
import { MATE, materialEval, type ScoredMove } from './snailEval';
import { toUci, type CandidateEngine } from './uci';

export type Level = 'easy' | 'medium' | 'hard';

export interface LevelConfig {
  /** Stockfish search depth for candidate generation. */
  sfDepth: number;
  multipv: number;
  /** Plies of snail-aware TS lookahead used to rescore candidates. */
  lookahead: number;
  /** Only moves within this many centipawns of the best are eligible for random selection. */
  margin: number;
  /** Softmax temperature (centipawns): higher = more willing to play the 2nd/3rd best move. */
  temperature: number;
}

export const LEVELS: Record<Level, LevelConfig> = {
  easy: { sfDepth: 3, multipv: 6, lookahead: 1, margin: 150, temperature: 80 },
  medium: { sfDepth: 8, multipv: 5, lookahead: 2, margin: 40, temperature: 20 },
  hard: { sfDepth: 14, multipv: 5, lookahead: 3, margin: 25, temperature: 12 },
};

/** Look at more Stockfish lines early on so openings vary between games. */
const OPENING_PLIES = 8;
const OPENING_MULTIPV = 8;

/**
 * Pick among near-best moves: candidates within `margin` of the best are sampled with weight
 * exp((score − best) / temperature). Forced wins/losses (|score| > MATE/4) are never gambled on.
 */
export function sampleMove<T extends { final: number }>(rows: T[], cfg: LevelConfig, rng: () => number): T {
  const sorted = [...rows].sort((a, b) => b.final - a.final);
  const best = sorted[0];
  if (Math.abs(best.final) > MATE / 4) return best;
  const pool = sorted.filter((r) => best.final - r.final <= cfg.margin && Math.abs(r.final) <= MATE / 4);
  const weights = pool.map((r) => Math.exp((r.final - best.final) / cfg.temperature));
  let x = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i];
    if (x <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Scores moves with the snail-aware lookahead (runs in a worker in the browser). */
export type LookaheadFn = (
  state: ImmortalChessState,
  depth: number,
  only?: MoveInput[],
) => Promise<ScoredMove[]> | ScoredMove[];

export interface ChooseMoveDeps {
  engine?: CandidateEngine | null;
  lookahead: LookaheadFn;
  rng?: () => number;
}

export interface Choice {
  move: MoveInput;
  score: number;
  source: 'stockfish+snail' | 'snail-search';
  candidates: { uci: string; sf?: number; snail: number; final: number }[];
}

const DOOMED = -MATE / 4;
/**
 * Stockfish sees snails as virtual blocker pieces, which it may "use" in its lines (e.g. a fake
 * mate with the blocker knight). Its scores are therefore clamped and never decide the game on
 * their own; only the snail-aware lookahead may report forced wins or losses.
 */
const SF_CLAMP = 1500;
const same = (a: MoveInput, b: MoveInput) => toUci(a) === toUci(b);

/**
 * Hybrid move choice (spec Part 2, Method 1):
 *  0. A shallow full-width snail search catches forced snail wins Stockfish cannot see.
 *  1. Stockfish MultiPV restricted (`searchmoves`) to snail-legal moves on `engineFen` (snails as
 *     virtual blockers where Stockfish's 16-pieces-per-side limit allows).
 *  2. Each candidate is rescored by the snail-aware lookahead: final = SF + (lookahead − static
 *     material), so Stockfish supplies chess judgement and the lookahead supplies snail danger.
 *     Forced snail deaths/wins from the lookahead override Stockfish outright; Stockfish's own
 *     scores are clamped (see SF_CLAMP).
 *  3. If every candidate is doomed, or there is no engine, fall back to a full-width lookahead.
 */
export async function chooseMove(
  state: ImmortalChessState,
  level: Level,
  deps: ChooseMoveDeps,
): Promise<Choice> {
  const cfg = LEVELS[level];
  const rng = deps.rng ?? Math.random;
  const legal = getLegalMoves(state);
  if (!legal.length) throw new Error('No legal moves');
  const side = turn(state);

  // Cheap full-width snail-tactics pass: Stockfish cannot see snail kills, so a forced snail win
  // (or a checkmate the lookahead proves) must be found here rather than in its candidate list.
  const quickDepth = Math.min(2, cfg.lookahead);
  const quick = await deps.lookahead(state, quickDepth);
  if (quick.length && quick[0].score > MATE / 4) {
    return {
      move: quick[0].move,
      score: quick[0].score,
      source: 'snail-search',
      candidates: quick.map((q) => ({ uci: toUci(q.move), snail: q.score, final: q.score })),
    };
  }

  const sfFen = deps.engine ? engineFen(state.fen, state.snails) : null;
  if (deps.engine && sfFen) {
    try {
      const sf = await deps.engine.analyze(sfFen, {
        depth: cfg.sfDepth,
        multipv: state.plyCount < OPENING_PLIES ? Math.max(cfg.multipv, OPENING_MULTIPV) : cfg.multipv,
        searchmoves: legal.map((m) => toUci({ from: m.from, to: m.to, promotion: m.promotion as MoveInput['promotion'] })),
      });
      if (!sf.length) console.warn('[bot] Stockfish returned no candidates for', sfFen);
      const candidates = sf.filter((c) => legal.some((m) => same(c.move, { from: m.from, to: m.to, promotion: m.promotion as MoveInput['promotion'] })));
      if (candidates.length) {
        const snail = await deps.lookahead(state, cfg.lookahead, candidates.map((c) => c.move));
        const rows = candidates.map((c) => {
          const s = snail.find((x) => same(x.move, c.move));
          const snailScore = s?.score ?? 0;
          const child = applyMove(state, c.move, { fast: true, legal });
          const adjust = snailScore - materialEval(child.fen, side);
          const sfCp = Math.max(-SF_CLAMP, Math.min(SF_CLAMP, c.cp));
          const final = Math.abs(snailScore) > MATE / 4 ? snailScore : sfCp + adjust;
          return { move: c.move, uci: toUci(c.move), sf: c.cp, snail: snailScore, final };
        });
        rows.sort((a, b) => b.final - a.final);
        if (rows[0].final > DOOMED) {
          const pick = sampleMove(rows, cfg, rng);
          return {
            move: pick.move,
            score: pick.final,
            source: 'stockfish+snail',
            candidates: rows.map(({ uci, sf, snail, final }) => ({ uci, sf, snail, final })),
          };
        }
      }
    } catch (err) {
      console.warn('[bot] Stockfish analysis failed, using snail search only', err);
    }
  }

  const scored = cfg.lookahead === quickDepth ? quick : await deps.lookahead(state, cfg.lookahead);
  const rows = scored
    .map((s) => ({ move: s.move, uci: toUci(s.move), snail: s.score, final: s.score }))
    .sort((a, b) => b.final - a.final);
  const pick = sampleMove(rows, cfg, rng);
  return {
    move: pick.move,
    score: pick.final,
    source: 'snail-search',
    candidates: rows.map(({ uci, snail, final }) => ({ uci, snail, final })),
  };
}
