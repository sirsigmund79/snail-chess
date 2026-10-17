import { describe, expect, it } from 'vitest';
import { parseFen } from '../../src/engine/fen';
import {
  applySnailTick,
  chebyshev,
  isTickPly,
  nextSnailStep,
  movesUntilSnails,
  pliesUntilTick,
} from '../../src/engine/snailEngine';

describe('nextSnailStep', () => {
  it('steps diagonally when both axes differ', () => {
    expect(nextSnailStep('a4', 'e8', null)).toBe('b5');
    expect(nextSnailStep('h5', 'e1', null)).toBe('g4');
  });

  it('steps orthogonally when aligned', () => {
    expect(nextSnailStep('e4', 'e8', null)).toBe('e5');
    expect(nextSnailStep('a1', 'h1', null)).toBe('b1');
  });

  it('stays when already on target', () => {
    expect(nextSnailStep('d4', 'd4', null)).toBe('d4');
  });

  it('sidesteps around the other snail while still closing distance', () => {
    const to = nextSnailStep('e4', 'e8', 'e5');
    expect(['d5', 'f5']).toContain(to);
    expect(chebyshev(to, 'e8')).toBe(3);
  });

  it('takes the orthogonal component when that still closes distance', () => {
    // c3 -> e8: primary d4 is blocked; c4 and b4 both reach distance 4, c4 is nearer.
    expect(nextSnailStep('c3', 'e8', 'd4')).toBe('c4');
  });

  it('waits when no other step closes the distance', () => {
    // On a pure diagonal only the diagonal step shortens Chebyshev distance.
    expect(nextSnailStep('a1', 'h8', 'b2')).toBe('a1');
  });
});

describe('tick timing', () => {
  it('ticks every 6 plies', () => {
    expect([1, 2, 3, 4, 5].map((n) => isTickPly(n))).toEqual([false, false, false, false, false]);
    expect(isTickPly(6)).toBe(true);
    expect(isTickPly(12)).toBe(true);
    expect(isTickPly(0)).toBe(false);
    expect(pliesUntilTick(0)).toBe(6);
    expect(pliesUntilTick(5)).toBe(1);
    expect(pliesUntilTick(6)).toBe(6);
    // Counted in moves: 3 at the start of a cycle, 1 when only Black's move remains.
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => movesUntilSnails(n))).toEqual([3, 3, 2, 2, 1, 1, 3]);
  });
});

describe('applySnailTick', () => {
  const snails = (w: string, b: string) => ({
    w: { square: w as never, color: 'w' as const },
    b: { square: b as never, color: 'b' as const },
  });

  it('crushes any piece, including its own side', () => {
    const { board } = parseFen('4k3/8/8/1P6/8/8/8/4K3 w - - 0 1');
    const r = applySnailTick(board, snails('a4', 'h5'));
    expect(r.moves[0]).toMatchObject({ color: 'w', from: 'a4', to: 'b5', crushed: { type: 'p', color: 'w' } });
    expect(r.crushedKing).toBeNull();
  });

  it('reports a crushed king and stops the tick', () => {
    const { board } = parseFen('8/8/8/8/8/8/8/k3K3 w - - 0 1');
    const r = applySnailTick(board, snails('b2', 'h5'));
    expect(r.crushedKing).toBe('b');
    expect(r.moves).toHaveLength(1);
    expect(r.snails.b.square).toBe('h5');
  });

  it('crushes both kings at once when both snails reach them in the same tick', () => {
    const { board } = parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const r = applySnailTick(board, snails('d7', 'd2'));
    expect(r.crushedKing).toBe('both');
    expect(r.moves.map((m) => [m.color, m.to, m.crushed?.type])).toEqual([
      ['w', 'e8', 'k'],
      ['b', 'e1', 'k'],
    ]);
    expect(r.board.some((p) => p?.type === 'k')).toBe(false);
  });

  it('resolves white first; black sidesteps a clash', () => {
    // White d4 -> e5 (toward e8). Black f6 also wants e5 (toward e1), so it sidesteps to f5.
    const { board } = parseFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const r = applySnailTick(board, snails('d4', 'f6'));
    expect(r.snails.w.square).toBe('e5');
    expect(r.snails.b.square).toBe('f5');
  });
});
