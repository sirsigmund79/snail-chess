import { applyMove, getLegalMoves, turn } from '../engine/game';
import { shadowFen } from '../engine/boardValidator';
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
  /** Uniform random noise (centipawns) added to final scores. */
  noise: number;
}

export const LEVELS: Record<Level, LevelConfig> = {
  easy: { sfDepth: 3, multipv: 6, lookahead: 1, noise: 120 },
  medium: { sfDepth: 8, multipv: 5, lookahead: 2, noise: 25 },
  hard: { sfDepth: 14, multipv: 5, lookahead: 3, noise: 0 },
};

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
 *  1. Stockfish MultiPV restricted (`searchmoves`) to snail-legal moves on the shadow FEN.
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
  const jitter = () => (cfg.noise ? (rng() * 2 - 1) * cfg.noise : 0);

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

  if (deps.engine) {
    try {
      const sf = await deps.engine.analyze(shadowFen(state.fen, state.snails), {
        depth: cfg.sfDepth,
        multipv: cfg.multipv,
        searchmoves: legal.map((m) => toUci({ from: m.from, to: m.to, promotion: m.promotion as MoveInput['promotion'] })),
      });
      const candidates = sf.filter((c) => legal.some((m) => same(c.move, { from: m.from, to: m.to, promotion: m.promotion as MoveInput['promotion'] })));
      if (candidates.length) {
        const snail = await deps.lookahead(state, cfg.lookahead, candidates.map((c) => c.move));
        const rows = candidates.map((c) => {
          const s = snail.find((x) => same(x.move, c.move));
          const snailScore = s?.score ?? 0;
          const child = applyMove(state, c.move, { fast: true, legal });
          const adjust = snailScore - materialEval(child.fen, side);
          const sfCp = Math.max(-SF_CLAMP, Math.min(SF_CLAMP, c.cp));
          const final = Math.abs(snailScore) > MATE / 4 ? snailScore : sfCp + adjust + jitter();
          return { move: c.move, uci: toUci(c.move), sf: c.cp, snail: snailScore, final };
        });
        rows.sort((a, b) => b.final - a.final);
        if (rows[0].final > DOOMED) {
          return {
            move: rows[0].move,
            score: rows[0].final,
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
    .map((s) => ({ move: s.move, uci: toUci(s.move), snail: s.score, final: s.score + (Math.abs(s.score) > MATE / 4 ? 0 : jitter()) }))
    .sort((a, b) => b.final - a.final);
  return {
    move: rows[0].move,
    score: rows[0].final,
    source: 'snail-search',
    candidates: rows.map(({ uci, snail, final }) => ({ uci, snail, final })),
  };
}
