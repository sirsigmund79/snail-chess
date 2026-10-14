import { describe, expect, it } from 'vitest';
import { MATE } from '../../src/bot/snailEval';
import { MultiPvCollector, uciCommands } from '../../src/bot/uci';
import { generateRoomCode, isRoomCode } from '../../src/network/roomCode';

describe('MultiPvCollector', () => {
  it('keeps the deepest line per PV slot and maps mate scores', () => {
    const c = new MultiPvCollector();
    c.push('info depth 5 seldepth 7 multipv 1 score cp 30 nodes 1 pv e2e4 e7e5');
    c.push('info depth 5 seldepth 7 multipv 2 score cp 10 nodes 1 pv d2d4');
    c.push('info depth 6 seldepth 7 multipv 1 score cp 25 lowerbound nodes 1 pv e2e4');
    c.push('info depth 6 seldepth 7 multipv 1 score mate 2 nodes 1 pv g1f3');
    const out = c.push('bestmove g1f3 ponder e7e5');
    expect(out?.map((x) => x.move.from + x.move.to)).toEqual(['g1f3', 'd2d4']);
    expect(out?.[0].cp).toBe(MATE - 4);
  });

  it('falls back to bestmove when no info lines arrived', () => {
    const out = new MultiPvCollector().push('bestmove e7e8q');
    expect(out).toEqual([{ move: { from: 'e7', to: 'e8', promotion: 'q' }, cp: 0, depth: 0 }]);
  });

  it('builds a restricted search command', () => {
    expect(uciCommands('8/8/8/8/8/8/8/8 w - - 0 1', { depth: 4, multipv: 3, searchmoves: ['e2e4', 'd2d4'] }).at(-1)).toBe(
      'go depth 4 searchmoves e2e4 d2d4',
    );
  });
});

describe('room codes', () => {
  it('generates valid codes', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(isRoomCode(code)).toBe(true);
    expect(isRoomCode('abc')).toBe(false);
  });
});
