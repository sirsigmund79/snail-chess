import { describe, expect, it } from 'vitest';
import { applyMove, createGame } from '../../src/engine';
import { framesFor } from '../../src/ui/usePlayback';

describe('snail playback frames', () => {
  it('ends a king crush with the SLIMED finale instead of a banner', () => {
    const g = createGame({ fen: '4k2r/8/8/8/8/8/8/R3K3 b - - 0 1', snails: { w: 'd7', b: 'h1' }, plyCount: 5 });
    const after = applyMove(g, { from: 'e8', to: 'e7' });
    const frames = framesFor(after.history[0], after);
    const last = frames[frames.length - 1];
    expect(last.slimed).toEqual({ victim: 'b', by: 'w' });
    expect(last.banner).toBeUndefined();
    expect(frames.some((f) => f.crush?.square === 'e7')).toBe(true);
  });

  it('keeps the normal banner for ordinary crushes', () => {
    const g = createGame({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      snails: { w: 'd6', b: 'h4' },
      plyCount: 5,
    });
    const after = applyMove(g, { from: 'a7', to: 'a6' });
    const frames = framesFor(after.history[0], after);
    expect(frames.some((f) => f.slimed)).toBe(false);
    expect(frames.some((f) => f.banner?.text.includes("crushed Black's pawn"))).toBe(true);
  });
});
