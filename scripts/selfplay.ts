/**
 * Headless bot-vs-bot batch runner (spec Part 4.2).
 *
 *   npx tsx scripts/selfplay.ts --games 20 [--white medium] [--black hard] [--no-stockfish]
 *                               [--max-plies 200] [--alpha 120] [--seed 1]
 *                               [--every 2|3|4] [--straight] [--weak]
 *
 * Colours alternate each game. Reports how games end, average length and "unforced snail
 * deaths": a king crushed when its owner, on their last move, had a move that kept the king
 * out of the snail's reach.
 */
import { parseArgs } from 'node:util';
import { chooseMove, type Level } from '../src/bot/hybrid';
import { seededRng } from '../src/bot/rng';
import { DEFAULT_WEIGHTS, scoreMoves, type SnailWeights } from '../src/bot/snailEval';
import type { CandidateEngine } from '../src/bot/uci';
import {
  applyMove,
  createGame,
  findKing,
  getLegalMoves,
  nextSnailStep,
  opposite,
  parseFen,
  pliesUntilTick,
  turn,
  type GameRules,
  type ImmortalChessState,
} from '../src/engine';
import { cleanRules } from '../src/network/protocol';
import { createNodeStockfish } from './nodeStockfish';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '10' },
    white: { type: 'string', default: 'medium' },
    black: { type: 'string', default: 'hard' },
    'max-plies': { type: 'string', default: '200' },
    'no-stockfish': { type: 'boolean', default: false },
    alpha: { type: 'string' },
    quiet: { type: 'boolean', default: false },
    seed: { type: 'string', default: '1' },
    // Variant rules (defaults otherwise): snails step every N moves, no diagonals, weak snails.
    every: { type: 'string', default: '3' },
    straight: { type: 'boolean', default: false },
    weak: { type: 'boolean', default: false },
  },
});

const games = Number(values.games);
const maxPlies = Number(values['max-plies']);
const weights: SnailWeights = { ...DEFAULT_WEIGHTS, ...(values.alpha ? { alpha: Number(values.alpha) } : {}) };
const rules: GameRules = cleanRules({
  movesPerTick: Number(values.every),
  movement: values.straight ? 'straight' : 'diagonal',
  strength: values.weak ? 'weak' : 'unstoppable',
});
const levels = [values.white as Level, values.black as Level];
const engines: (CandidateEngine | null)[] = values['no-stockfish']
  ? [null, null]
  : [createNodeStockfish(), createNodeStockfish()];

/** Could the player who just moved have kept their king clear of the snail's next step? */
function wasAvoidable(before: ImmortalChessState): boolean {
  const mover = turn(before);
  return getLegalMoves(before).some((m) => {
    const after = applyMove(before, { from: m.from, to: m.to, promotion: m.promotion as 'q' | undefined }, { fast: true });
    if (after.gameStatus !== 'in_progress' && after.winner !== mover) return false;
    const king = findKing(parseFen(after.fen).board, mover);
    if (!king) return false;
    const enemy = opposite(mover);
    const step = nextSnailStep(after.snails[enemy].square, king, after.snails[mover].square, rules, parseFen(after.fen).board);
    return step !== king || pliesUntilTick(after.plyCount, rules) > 1;
  });
}

interface Result {
  status: string;
  winnerLevel: Level | 'draw';
  plies: number;
  unforcedSnailDeath: boolean;
}

async function playGame(i: number): Promise<Result> {
  const rng = seededRng(Number(values.seed) * 1000 + i);
  const flip = i % 2 === 1;
  const seat = (c: 'w' | 'b') => ((c === 'w') !== flip ? 0 : 1);
  let state = createGame({ rules });
  let prevByColor: Record<'w' | 'b', ImmortalChessState | null> = { w: null, b: null };
  while (state.gameStatus === 'in_progress' && state.plyCount < maxPlies) {
    const side = turn(state);
    const s = seat(side);
    const choice = await chooseMove(state, levels[s], {
      engine: engines[s],
      lookahead: (st, d, only) => scoreMoves(st, d, weights, only).scored,
      rng,
    });
    prevByColor = { ...prevByColor, [side]: state };
    state = applyMove(state, choice.move);
  }
  let unforced = false;
  if (state.gameStatus.startsWith('snail_win') && state.winner) {
    const loser = opposite(state.winner);
    const before = prevByColor[loser];
    unforced = !!before && wasAvoidable(before);
  }
  const winnerLevel = state.winner ? levels[seat(state.winner)] : 'draw';
  return {
    status: state.gameStatus === 'in_progress' ? 'adjudicated_draw' : state.gameStatus,
    winnerLevel,
    plies: state.plyCount,
    unforcedSnailDeath: unforced,
  };
}

const results: Result[] = [];
const t0 = Date.now();
for (let i = 0; i < games; i++) {
  const r = await playGame(i);
  results.push(r);
  if (!values.quiet) {
    const white = levels[i % 2 === 1 ? 1 : 0];
    console.log(`game ${i + 1}/${games} (${white} as White): ${r.status} → ${r.winnerLevel} in ${r.plies} plies${r.unforcedSnailDeath ? ' [unforced snail death]' : ''}`);
  }
}
engines.forEach((e) => e?.dispose());

const pct = (n: number) => `${((100 * n) / results.length).toFixed(1)}%`;
const count = (f: (r: Result) => boolean) => results.filter(f).length;
const snailWins = count((r) => r.status.startsWith('snail_win'));
const unforced = count((r) => r.unforcedSnailDeath);
console.log('\n=== Self-play summary ===');
console.log(`games:              ${results.length} (${levels[0]} vs ${levels[1]}, ${values['no-stockfish'] ? 'snail search only' : 'stockfish+snail'})`);
console.log(`rules:              every ${rules.movesPerTick} moves · ${rules.movement} · ${rules.strength}`);
console.log(`checkmate:          ${pct(count((r) => r.status === 'checkmate'))}`);
console.log(`snail capture:      ${pct(snailWins)}`);
console.log(`draw:               ${pct(count((r) => r.status === 'draw' || r.status === 'adjudicated_draw'))}`);
for (const lvl of new Set(levels)) console.log(`${lvl} wins:`.padEnd(20) + pct(count((r) => r.winnerLevel === lvl)));
console.log(`avg plies:          ${(results.reduce((a, r) => a + r.plies, 0) / results.length).toFixed(1)}`);
console.log(`unforced snail deaths: ${unforced} (${pct(unforced)})`);
console.log(`elapsed:            ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (unforced / results.length > 0.15) {
  console.log(`\n⚠ More than 15% unforced snail deaths: raise the proximity penalty (--alpha > ${weights.alpha}).`);
}
