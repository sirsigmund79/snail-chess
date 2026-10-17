import { describe, expect, it } from 'vitest';
import { applyMove, createGame } from '../../src/engine';
import { framesFor, STIR_PHRASES, stirPhrase } from '../../src/ui/usePlayback';

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

  it('plays a blocked snail as a bump, White first, without moving it', () => {
    const g = createGame({
      fen: 'rnbqkbnr/p1p1pppp/8/1p1p4/1PP5/8/P2PPPPP/RNBQKBNR b KQkq - 0 4',
      rules: { movesPerTick: 2, movement: 'straight', strength: 'weak' },
      plyCount: 3,
    });
    const after = applyMove(g, { from: 'h7', to: 'h6' });
    const bumps = framesFor(after.history[0], after).filter((f) => f.bump);
    expect(bumps.map((f) => [f.bump!.color, f.bump!.toward, f.snails[f.bump!.color].square])).toEqual([
      ['w', 'a5', 'a4'],
      ['b', 'a4', 'a5'],
    ]);
  });

  it('shows a double crush as a draw, without the SLIMED finale', () => {
    const g = createGame({ fen: '4k3/7p/8/8/8/8/P7/4K3 b - - 0 1', snails: { w: 'd7', b: 'd2' }, plyCount: 5 });
    const after = applyMove(g, { from: 'h7', to: 'h6' });
    const frames = framesFor(after.history[0], after);
    expect(frames.some((f) => f.slimed)).toBe(false);
    expect(frames[frames.length - 1].banner?.text).toBe('Both kings slimed! Draw.');
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

describe('snail warning banner', () => {
  it('cycles through the approved phrases, one per snail move, then loops', () => {
    expect(STIR_PHRASES).toHaveLength(15);
    expect(stirPhrase(6)).toBe('The snails stir…');
    expect(stirPhrase(12)).toBe('The snails are on the move…');
    expect(stirPhrase(18)).toBe('The snails march on…');
    expect(stirPhrase(90)).toBe('The snails glide forward…');
    expect(stirPhrase(96)).toBe('The snails stir…');
  });

  it("no longer announces each snail's step", () => {
    const g = createGame();
    let s = g;
    for (const [from, to] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6']] as const) {
      s = applyMove(s, { from, to });
    }
    const banners = framesFor(s.history[5], s).flatMap((f) => (f.banner ? [f.banner.text] : []));
    expect(banners).toEqual(['The snails stir…']);
  });
});
