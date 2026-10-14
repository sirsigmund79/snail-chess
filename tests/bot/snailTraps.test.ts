import { afterAll, describe, expect, it } from 'vitest';
import { chooseMove, type Level } from '../../src/bot/hybrid';
import { scoreMoves } from '../../src/bot/snailEval';
import type { CandidateEngine } from '../../src/bot/uci';
import { applyMove, chebyshev, createGame, findKing, parseFen } from '../../src/engine';
import { createNodeStockfish } from '../../scripts/nodeStockfish';

/**
 * Snail trap suite (spec Part 4.1). Runs against the pure-TS lookahead by default; set
 * STOCKFISH=1 to also run the hybrid Stockfish + snail rescoring path.
 */
const engines: { name: string; engine: CandidateEngine | null }[] = [{ name: 'snail-search', engine: null }];
if (process.env.STOCKFISH) engines.push({ name: 'stockfish+snail', engine: createNodeStockfish() });
afterAll(() => engines.forEach((e) => e.engine?.dispose()));

const lookahead = (s: Parameters<typeof scoreMoves>[0], d: number, only?: Parameters<typeof scoreMoves>[3]) =>
  scoreMoves(s, d, undefined, only).scored;

const levels: Level[] = ['medium', 'hard'];

describe.each(engines)('snail traps ($name)', ({ engine }) => {
  describe.each(levels)('level %s', (level) => {
    const pick = (state: ReturnType<typeof createGame>) =>
      chooseMove(state, level, { engine, lookahead, rng: () => 0.5 });

    it('Imminent Crush: steps the king out of the snail’s reach', async () => {
      // Black snail on d2 is adjacent to the White king; the tick fires after Black's reply.
      const g = createGame({ fen: '4k2r/8/8/8/8/8/8/R3K3 w - - 0 1', snails: { w: 'a7', b: 'd2' }, plyCount: 4 });
      const { move } = await pick(g);
      expect(move.from).toBe('e1');
      expect(chebyshev(move.to, 'd2')).toBeGreaterThanOrEqual(2);
    });

    it('Blunder Sacrifice: ignores a free queen when the snail would crush the king', async () => {
      const g = createGame({ fen: '7k/8/8/1q6/8/2N5/8/4K3 w - - 0 1', snails: { w: 'a7', b: 'd2' }, plyCount: 4 });
      const { move } = await pick(g);
      expect(`${move.from}${move.to}`).not.toBe('c3b5');
      expect(move).toMatchObject({ from: 'e1', to: 'f2' });
      const after = applyMove(g, move);
      const next = applyMove(after, { from: 'b5', to: 'b4' });
      expect(next.gameStatus).toBe('in_progress');
    });

    it('Snail Herding: checks the enemy king onto the snail’s path', async () => {
      // Ra8+ forces Kg7, right where the White snail on f6 lands at the tick.
      const g = createGame({ fen: '7k/7p/8/8/8/8/8/R5K1 w - - 0 1', snails: { w: 'f6', b: 'b3' }, plyCount: 4 });
      const { move } = await pick(g);
      expect(move).toMatchObject({ from: 'a1', to: 'a8' });
      const forced = applyMove(applyMove(g, move), { from: 'h8', to: 'g7' });
      expect(forced.gameStatus).toBe('snail_win_white');
      expect(findKing(parseFen(forced.fen).board, 'b')).toBeNull();
    });
  });
});


describe.runIf(process.env.STOCKFISH)('stockfish is actually consulted', () => {
  it.each(levels)('uses Stockfish candidates in the opening (%s)', async (level) => {
    const g = applyMove(createGame(), { from: 'e2', to: 'e4' });
    const choice = await chooseMove(g, level, { engine: engines[1].engine, lookahead });
    expect(choice.source).toBe('stockfish+snail');
    expect(choice.candidates.length).toBeGreaterThanOrEqual(5);
  });
});

describe('snail king safety', () => {
  it('does not castle into the path of an oncoming snail', async () => {
    // Black's snail on f3 heads for g1: castling short walks into a box behind f2/g2/h2.
    const g = createGame({
      fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P4/PPP2PPP/RNBQK2R w KQkq - 0 1',
      snails: { w: 'a6', b: 'f3' },
      plyCount: 7,
    });
    for (const level of levels) {
      const { move } = await chooseMove(g, level, { engine: null, lookahead, rng: () => 0.5 });
      expect(`${move.from}${move.to}`, level).not.toBe('e1g1');
    }
  });
});
