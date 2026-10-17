/**
 * Reference positions for the Fairy-Stockfish fork: plays seeded random games in every rule set
 * and writes one JSON line per position, so the fork can be checked against this engine (the
 * one the game and the room server trust).
 *
 *   npx tsx scripts/dump-positions.ts [--games 60] [--max-plies 300] [--seed 1] [--out positions.jsonl]
 *
 * Each line: { variant, game, ply, fen, legal, move, after, status } where fen/after are in the
 * engine's FEN (snails as S/s, see src/engine/fairy.ts), legal is the sorted UCI move list,
 * and status describes the position after the move. The last line of each game also carries
 * `start` (the game's starting FEN) and `moves` (the whole game in UCI), so repetition draws can
 * be replayed.
 *
 * Even-numbered games lean towards king moves and captures, so kings wander into snail paths
 * and games reach crushes and snail wins quickly; odd-numbered games are plain random, so long
 * games with castling, promotions, en passant and draws are covered too. A few more games per
 * rule set start from sparse positions (pawns about to promote, bare kings and rooks) to reach
 * promotions, stalemate, insufficient material and the 50-move rule.
 */
import { createWriteStream } from 'node:fs';
import { parseArgs } from 'node:util';
import { seededRng } from '../src/bot/rng';
import { applyMove, createGame, getLegalMoves } from '../src/engine/game';
import { fairyVariant, toFairyFen } from '../src/engine/fairy';
import type { GameRules, ImmortalChessState, MoveInput, Square } from '../src/engine/types';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '60' },
    'max-plies': { type: 'string', default: '300' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: 'positions.jsonl' },
  },
});
const games = Number(values.games);
const maxPlies = Number(values['max-plies']);
const rng = seededRng(Number(values.seed));
const out = createWriteStream(values.out);

const ALL_RULES: GameRules[] = [];
for (const movesPerTick of [2, 3, 4] as const)
  for (const movement of ['diagonal', 'straight'] as const)
    for (const strength of ['unstoppable', 'weak'] as const) ALL_RULES.push({ movesPerTick, movement, strength });

/** Sparse starts: [FEN, snails]. White to move, ply 0, so the engine sees the same timing. */
const EXTRA_STARTS: [string, { w: Square; b: Square }][] = [
  ['4k3/PPPP4/8/8/8/8/4pppp/4K3 w - - 0 1', { w: 'a4', b: 'h5' }],
  ['7k/8/8/8/8/8/8/R3K3 w Q - 0 1', { w: 'a4', b: 'h4' }],
  ['k7/8/1P6/8/8/8/8/7K w - - 0 1', { w: 'd4', b: 'e5' }],
  ['r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', { w: 'a4', b: 'a5' }],
];

const uci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '');

function status(s: ImmortalChessState) {
  if (s.gameStatus === 'in_progress') return { result: 'ongoing' };
  return { result: s.gameStatus, winner: s.winner, ...(s.drawReason ? { reason: s.drawReason } : {}) };
}

const counts: Record<string, Record<string, number>> = {};
for (const rules of ALL_RULES) {
  const variant = fairyVariant(rules);
  const tally = (counts[variant] = {} as Record<string, number>);
  const extra = Math.ceil(games / 4);
  for (let game = 0; game < games + extra * EXTRA_STARTS.length; game++) {
    const start = game >= games ? EXTRA_STARTS[Math.floor((game - games) / extra)] : null;
    let s = start ? createGame({ rules, fen: start[0], snails: start[1] }) : createGame({ rules });
    const startFen = toFairyFen(s);
    const played: string[] = [];
    while (s.gameStatus === 'in_progress' && s.plyCount < maxPlies) {
      const legal = getLegalMoves(s);
      const kings = legal.filter((m) => m.piece === 'k');
      const captures = legal.filter((m) => m.captured);
      const r = game % 2 || start ? 1 : rng();
      const pool = r < 0.3 && kings.length ? kings : r < 0.5 && captures.length ? captures : legal;
      const m = pool[Math.floor(rng() * pool.length)];
      const move: MoveInput = { from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion as MoveInput['promotion'] } : {}) };
      const next = applyMove(s, move, { legal });
      played.push(uci(move));
      const line = {
        variant,
        game,
        ply: s.plyCount,
        fen: toFairyFen(s),
        legal: legal.map(uci).sort(),
        move: uci(move),
        after: toFairyFen(next),
        status: status(next),
        ...(next.gameStatus !== 'in_progress' || next.plyCount >= maxPlies ? { start: startFen, moves: played } : {}),
      };
      out.write(JSON.stringify(line) + '\n');
      s = next;
    }
    const key = s.gameStatus === 'draw' ? `draw:${s.drawReason}` : s.gameStatus;
    tally[key] = (tally[key] ?? 0) + 1;
  }
}
out.end();
for (const [variant, tally] of Object.entries(counts)) console.log(variant.padEnd(12), JSON.stringify(tally));
