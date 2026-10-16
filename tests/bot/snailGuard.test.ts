import { describe, expect, it } from 'vitest';
import { chooseMove, type Level } from '../../src/bot/hybrid';
import { scoreMoves } from '../../src/bot/snailEval';
import { snailGuard } from '../../src/bot/snailGuard';
import { applyMove, chebyshev, createGame } from '../../src/engine';

const lookahead = (s: Parameters<typeof scoreMoves>[0], d: number, only?: Parameters<typeof scoreMoves>[3]) =>
  scoreMoves(s, d, undefined, only).scored;
const levels: Level[] = ['easy', 'medium', 'hard'];

describe('snailGuard', () => {
  it('does nothing when the snail is not about to strike', () => {
    expect(snailGuard(createGame())).toBeNull();
  });

  it('only allows moves that get the king out of reach', () => {
    // Black's snail on d2 is next to White's king; the snails move after Black's reply.
    const g = createGame({ fen: 'r3k3/ppp5/8/8/8/8/PPP5/R3K3 w - - 0 1', snails: { w: 'h7', b: 'd2' }, plyCount: 4 });
    const guard = snailGuard(g);
    expect(guard?.kind).toBe('restrict');
    if (guard?.kind !== 'restrict') return;
    for (const m of guard.allowed) {
      expect(m.from).toBe('e1');
      expect(chebyshev(m.to, 'd2')).toBeGreaterThanOrEqual(2);
    }
  });

  it('works for Black too (the snails move right after Black’s move)', () => {
    const g = createGame({ fen: 'r3k3/8/8/8/8/8/8/R3K3 b - - 0 1', snails: { w: 'd7', b: 'h2' }, plyCount: 5 });
    const guard = snailGuard(g);
    expect(guard?.kind).toBe('restrict');
    if (guard?.kind === 'restrict') expect(guard.allowed.every((m) => m.from === 'e8')).toBe(true);
  });

  it('prefers a checkmate right now over running', () => {
    // White's king is next to Black's snail, but Ra8 is mate.
    const g = createGame({ fen: '7k/6pp/8/8/8/8/8/R3K3 w - - 0 1', snails: { w: 'c5', b: 'd2' }, plyCount: 4 });
    expect(snailGuard(g)).toEqual({ kind: 'win', move: { from: 'a1', to: 'a8' } });
  });

  it('steps aside rather than trade kings when both snails strike at once', () => {
    // Both kings sit next to the enemy snail and Black's king is boxed in. Staying put means both
    // kings fall at the tick (a draw); stepping the White king away wins outright.
    const g = createGame({ fen: '3rkr2/3p1p2/8/8/8/8/8/R3K3 w - - 0 1', snails: { w: 'e7', b: 'd2' }, plyCount: 4 });
    const stay = applyMove(applyMove(g, { from: 'a1', to: 'a2' }), { from: 'd8', to: 'c8' });
    expect(stay).toMatchObject({ gameStatus: 'draw', drawReason: 'both_kings_crushed' });
    const guard = snailGuard(g);
    if (guard?.kind !== 'restrict') throw new Error(`expected a restriction, got ${JSON.stringify(guard)}`);
    expect(guard.allowed.every((m) => m.from === 'e1')).toBe(true);
  });

  it.each(levels)('the %s bot always steps out of reach', async (level) => {
    const g = createGame({ fen: 'r3k3/ppp5/8/8/8/8/PPP5/R3K3 w - - 0 1', snails: { w: 'h7', b: 'd2' }, plyCount: 4 });
    for (let i = 0; i < 5; i++) {
      const { move } = await chooseMove(g, level, { lookahead });
      expect(move.from).toBe('e1');
      expect(chebyshev(move.to, 'd2')).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('snail guard with the both-kings draw', () => {
  it('steps the king aside instead of settling for a double crush', () => {
    // Black to move at ply 23: White's snail on d7 takes e8, Black's on d2 takes e1. Kf8 escapes
    // and Black's snail then wins alone.
    const g = createGame({ fen: '4k3/7p/8/8/8/8/P7/4K3 b - - 0 1', snails: { w: 'd7', b: 'd2' }, plyCount: 23 });
    const r = snailGuard(g);
    if (r?.kind !== 'win') throw new Error(`expected a winning escape, got ${JSON.stringify(r)}`);
    expect(applyMove(g, r.move)).toMatchObject({ gameStatus: 'snail_win_black', winner: 'b' });
  });
});
