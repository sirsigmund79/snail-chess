import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createGame,
  fromSnapshot,
  getLegalMoves,
  IllegalMoveError,
  toSnapshot,
  type ImmortalChessState,
  type Square,
} from '../../src/engine';
import { inCheck } from '../../src/engine/boardValidator';

const uci = (s: ImmortalChessState) =>
  getLegalMoves(s).map((m) => m.from + m.to + (m.promotion ?? ''));

function play(state: ImmortalChessState, ...moves: string[]) {
  return moves.reduce(
    (s, m) =>
      applyMove(s, {
        from: m.slice(0, 2) as Square,
        to: m.slice(2, 4) as Square,
        ...(m[4] ? { promotion: m[4] as 'q' } : {}),
      }),
    state,
  );
}

describe('game flow', () => {
  it('starts with snails on a4 / h5 and 20 legal moves minus blocked ones', () => {
    const g = createGame();
    expect(g.snails.w.square).toBe('a4');
    expect(g.snails.b.square).toBe('h5');
    const moves = uci(g);
    expect(moves).not.toContain('a2a4'); // lands on snail
    expect(moves).toContain('a2a3');
    expect(moves).toHaveLength(19);
  });

  it('advances snails after every 6th ply only', () => {
    let g = createGame();
    g = play(g, 'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4');
    expect(g.snails.w.square).toBe('a4');
    expect(g.history.every((h) => !h.tick)).toBe(true);
    g = play(g, 'g8f6');
    expect(g.plyCount).toBe(6);
    expect(g.snails.w.square).toBe('b5');
    expect(g.snails.b.square).toBe('g4');
    expect(g.history[5].tick?.moves).toHaveLength(2);
  });

  it('crushes a piece on the landing square', () => {
    let g = createGame({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      snails: { w: 'd6', b: 'h4' },
      plyCount: 5,
    });
    // d6 is attacked by the e7/c7 pawns but they can't capture a snail.
    expect(uci(g)).not.toContain('e7d6');
    g = play(g, 'a7a6');
    expect(g.snails.w.square).toBe('e7');
    expect(g.history[0].tick?.moves[0].crushed).toEqual({ type: 'p', color: 'b' });
    expect(g.fen.split(' ')[0]).toBe('rnbqkbnr/1ppp1ppp/p7/8/4P3/8/PPPP1PPP/RNBQKBNR');
  });

  it('declares a snail victory when a king is crushed', () => {
    let g = createGame({ fen: '4k2r/8/8/8/8/8/8/R3K3 b - - 0 1', snails: { w: 'd7', b: 'h1' }, plyCount: 5 });
    g = play(g, 'e8e7');
    expect(g.gameStatus).toBe('snail_win_white');
    expect(g.winner).toBe('w');
    expect(() => play(g, 'a1a2')).toThrow(IllegalMoveError);
  });

  it('ends the game if a snail stepping away exposes a king to capture', () => {
    let g = createGame({ fen: '4k3/7p/8/8/8/8/8/4R2K b - - 0 1', snails: { w: 'a4', b: 'e5' }, plyCount: 5 });
    expect(g.gameStatus).toBe('in_progress');
    g = play(g, 'h7h6');
    expect(g.snails.b.square).toBe('f4');
    expect(g.gameStatus).toBe('checkmate');
    expect(g.winner).toBe('w');
  });
});

describe('snail impassability', () => {
  it('blocks sliders and pawn double pushes passing through', () => {
    const g = createGame({ fen: 'k6r/8/8/8/8/8/4P3/R3K3 w - - 0 1', snails: { w: 'a4', b: 'e3' } });
    const moves = uci(g);
    expect(moves.filter((m) => m.startsWith('a1'))).toEqual(
      expect.arrayContaining(['a1a2', 'a1a3', 'a1b1']),
    );
    expect(moves).not.toContain('a1a4');
    expect(moves).not.toContain('a1a5');
    expect(moves).not.toContain('e2e3');
    expect(moves).not.toContain('e2e4');
  });

  it('lets knights jump over snails but not land on them', () => {
    const g = createGame({ fen: 'k6r/8/8/8/8/8/8/4K1N1 w - - 0 1', snails: { w: 'g2', b: 'f3' } });
    const moves = uci(g);
    expect(moves).toContain('g1h3');
    expect(moves).toContain('g1e2');
    expect(moves).not.toContain('g1f3');
  });

  it('forbids castling through a snail', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(uci(createGame({ fen, snails: { w: 'f1', b: 'h5' } }))).not.toContain('e1g1');
    expect(uci(createGame({ fen, snails: { w: 'b1', b: 'h5' } }))).not.toContain('e1c1');
    expect(uci(createGame({ fen, snails: { w: 'a4', b: 'h5' } }))).toEqual(
      expect.arrayContaining(['e1g1', 'e1c1']),
    );
  });

  it('blocks lines of attack: no check and no pin through a snail', () => {
    const g = createGame({ fen: '4r1k1/8/8/8/8/8/4B3/4K3 w - - 0 1', snails: { w: 'e4', b: 'a5' } });
    expect(inCheck(g.fen, g.snails)).toBe(false);
    expect(uci(g)).toContain('e2b5'); // bishop is not pinned
  });

  it('detects stalemate caused by snails', () => {
    const g = createGame({ fen: '7k/8/8/8/8/8/8/KB6 b - - 0 1', snails: { w: 'g7', b: 'g8' } });
    expect(g.gameStatus).toBe('draw');
    expect(g.drawReason).toBe('stalemate');
  });

  it('detects checkmate with snails as walls', () => {
    // Black king h8 is walled in by snails on g8/g7; Rh1 mates along the h-file.
    let g = createGame({ fen: '7k/8/8/8/8/8/8/K5R1 w - - 0 1', snails: { w: 'g7', b: 'g8' } });
    expect(g.gameStatus).toBe('in_progress');
    g = play(g, 'g1h1');
    expect(g.history[0].san).toBe('Rh1#');
    expect(g.gameStatus).toBe('checkmate');
    expect(g.winner).toBe('w');
  });
});

describe('SAN and snapshots', () => {
  it('produces SAN with snail-aware check markers', () => {
    const g = play(createGame(), 'e2e4');
    expect(g.history[0].san).toBe('e4');
    expect(g.history[0].color).toBe('w');
  });

  it('round-trips through a snapshot', () => {
    const g = play(createGame(), 'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6');
    const snap = toSnapshot(g);
    expect(snap).toMatch(/\[S:b5,g4\] \[P:6\]$/);
    const r = fromSnapshot(snap);
    expect(r.fen).toBe(g.fen);
    expect(r.snails).toEqual(g.snails);
    expect(r.plyCount).toBe(6);
  });
});
