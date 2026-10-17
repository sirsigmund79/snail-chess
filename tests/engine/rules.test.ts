import { describe, expect, it } from 'vitest';
import { applyMove, createGame } from '../../src/engine/game';
import { parseFen } from '../../src/engine/fen';
import { applySnailTick, movesUntilSnails, nextSnailStep, pliesUntilTick } from '../../src/engine/snailEngine';
import { DEFAULT_RULES, type GameRules, type MoveInput } from '../../src/engine/types';

const rules = (r: Partial<GameRules>): GameRules => ({ ...DEFAULT_RULES, ...r });
const snails = (w: string, b: string) => ({
  w: { square: w as never, color: 'w' as const },
  b: { square: b as never, color: 'b' as const },
});

describe('moves per snail step', () => {
  it('ticks after 2, 3 or 4 full moves', () => {
    for (const n of [2, 3, 4] as const) {
      const r = rules({ movesPerTick: n });
      expect(pliesUntilTick(0, r)).toBe(n * 2);
      expect(movesUntilSnails(0, r)).toBe(n);
    }
  });

  it('moves the snails after the 4th ply with movesPerTick 2', () => {
    const shuffle: MoveInput[] = [
      { from: 'g1', to: 'f3' },
      { from: 'g8', to: 'f6' },
      { from: 'f3', to: 'g1' },
      { from: 'f6', to: 'g8' },
    ];
    let s = createGame({ rules: rules({ movesPerTick: 2 }) });
    for (const m of shuffle.slice(0, 3)) s = applyMove(s, m);
    expect(s.snails.w.square).toBe('a4');
    s = applyMove(s, shuffle[3]);
    expect(s.history[3].tick).toBeDefined();
    expect(s.snails.w.square).toBe('b5');
    expect(s.rules.movesPerTick).toBe(2);
  });
});

describe('straight movement', () => {
  const straight = rules({ movement: 'straight' });

  it('never steps diagonally; the longer axis goes first, rank on a tie', () => {
    expect(nextSnailStep('a4', 'e8', null, straight)).toBe('a5');
    expect(nextSnailStep('a4', 'h5', null, straight)).toBe('b4');
    expect(nextSnailStep('d4', 'd8', null, straight)).toBe('d5');
  });

  it('takes the other axis when the other snail is in the way, else sidesteps instead of waiting', () => {
    expect(nextSnailStep('a4', 'e8', 'a5', straight)).toBe('b4');
    expect(nextSnailStep('d4', 'd8', 'd5', straight)).toBe('c4');
  });

  it('crushes along a rook path in a real tick', () => {
    const { board } = parseFen('4k3/8/8/P7/8/8/8/4K3 w - - 0 1');
    const r = applySnailTick(board, snails('a4', 'h5'), straight);
    expect(r.moves[0]).toMatchObject({ from: 'a4', to: 'a5', crushed: { type: 'p' } });
  });
});

describe('weak snails', () => {
  const weak = rules({ strength: 'weak' });

  it('step around a piece onto the next shortest path instead of crushing it', () => {
    // a4 -> e8: b5 holds a pawn. a5 and b4 are both still 4 steps from e8; a5 is nearer.
    const { board } = parseFen('4k3/8/8/1P6/8/8/8/4K3 w - - 0 1');
    const r = applySnailTick(board, snails('a4', 'h5'), weak);
    expect(r.moves[0]).toMatchObject({ from: 'a4', to: 'a5' });
    expect(r.moves[0].crushed).toBeUndefined();
    expect(r.board.filter(Boolean)).toHaveLength(3);
  });

  it('go the long way round a wall', () => {
    // Snail a1 hunting a3; a2 and b2 are blocked, so it goes b1 -> c2 -> b3 -> a3 instead of waiting.
    const { board } = parseFen('8/8/8/8/8/k7/PP6/7K w - - 0 1');
    expect(nextSnailStep('a1', 'a3', null, weak, board)).toBe('b1');
  });

  it('wait when walled in completely', () => {
    const { board } = parseFen('8/8/8/8/8/k7/PP6/1P5K w - - 0 1');
    expect(nextSnailStep('a1', 'a3', null, weak, board)).toBe('a1');
  });

  it('still crush the hunted king', () => {
    const { board } = parseFen('8/8/8/8/8/8/8/k3K3 w - - 0 1');
    const r = applySnailTick(board, snails('b2', 'h5'), weak);
    expect(r.crushedKing).toBe('b');
  });

  it('keep moving when the king is boxed in by its own pieces', () => {
    // Straight + weak from the start-like position: both kings are walled in (d, f and the e-pawn),
    // and each snail's way forward is a snail or a pawn. They still step: White's to a3, Black's
    // to a6, heading for the open centre.
    const { board } = parseFen('rnbqkbnr/p1p1pppp/8/1p1p4/1PP5/8/P2PPPPP/RNBQKBNR w KQkq - 0 5');
    const r = applySnailTick(board, snails('a4', 'a5'), rules({ strength: 'weak', movement: 'straight' }));
    expect(r.moves.map((m) => [m.from, m.to])).toEqual([
      ['a4', 'a3'],
      ['a5', 'a6'],
    ]);
    expect(r.moves.some((m) => m.crushed)).toBe(false);
  });

  it('only wait when every square they could step to is taken', () => {
    const { board } = parseFen('4k3/8/1P6/1P6/PP6/8/8/4K3 w - - 0 1');
    // a5 boxed in by pawns on a4, b4, b5, b6 and the other snail on a6.
    expect(nextSnailStep('a5', 'e8', 'a6', weak, board)).toBe('a5');
  });

  it('combine with straight movement', () => {
    // a4 -> e8 straight: a5 holds a pawn, so it goes b4 (also 7 rook steps away).
    const { board } = parseFen('4k3/8/8/P7/8/8/8/4K3 w - - 0 1');
    expect(nextSnailStep('a4', 'e8', null, rules({ strength: 'weak', movement: 'straight' }), board)).toBe('b4');
  });
});
