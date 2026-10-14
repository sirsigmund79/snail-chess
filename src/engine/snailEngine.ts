import { coordsToSq, findKing, onBoard, sqIndex, sqToCoords, type Board } from './fen';
import { TICK_INTERVAL, type Color, type SnailMove, type SnailState, type Square } from './types';

export function chebyshev(a: Square, b: Square): number {
  const [af, ar] = sqToCoords(a);
  const [bf, br] = sqToCoords(b);
  return Math.max(Math.abs(af - bf), Math.abs(ar - br));
}

/** True when the ply just played (1-based count) triggers a snail tick. */
export function isTickPly(plyCount: number): boolean {
  return plyCount > 0 && plyCount % TICK_INTERVAL === 0;
}

/** Plies remaining until the next tick, counted from the current ply count (1..6). */
export function pliesUntilTick(plyCount: number): number {
  return TICK_INTERVAL - (plyCount % TICK_INTERVAL);
}

/**
 * Full moves until the snails move, as players count them. Snails move right after Black's move,
 * so this is the number of Black moves left in the cycle (3, 2 or 1).
 */
export function movesUntilSnails(plyCount: number): number {
  return Math.ceil(pliesUntilTick(plyCount) / 2);
}

/**
 * Where a snail steps next. The primary step is (sign(dFile), sign(dRank)) toward the target.
 * If the other snail is in the way, fall back to any neighbouring square that still strictly
 * reduces the Chebyshev distance, preferring the one closest (Euclidean) to the target, then a
 * fixed scan order. If nothing works the snail stays put.
 */
export function nextSnailStep(from: Square, target: Square, blocked: Square | null): Square {
  const [sf, sr] = sqToCoords(from);
  const [tf, tr] = sqToCoords(target);
  const primary = coordsToSq(sf + Math.sign(tf - sf), sr + Math.sign(tr - sr));
  if (primary === from) return from;
  if (primary !== blocked) return primary;

  const dist = chebyshev(from, target);
  let best: { sq: Square; d2: number } | null = null;
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const f = sf + df;
      const r = sr + dr;
      if (!onBoard(f, r)) continue;
      const sq = coordsToSq(f, r);
      if (sq === blocked || chebyshev(sq, target) >= dist) continue;
      const d2 = (tf - f) ** 2 + (tr - r) ** 2;
      if (!best || d2 < best.d2) best = { sq, d2 };
    }
  }
  return best?.sq ?? from;
}

export interface TickResult {
  board: Board;
  snails: { w: SnailState; b: SnailState };
  moves: SnailMove[];
  /** Colour of the king that was crushed, if any. */
  crushedKing: Color | null;
}

/**
 * Advance both snails one step. White's snail resolves first; if it crushes the Black king the
 * tick stops there. Any piece on a landing square is removed.
 */
export function applySnailTick(board: Board, snails: { w: SnailState; b: SnailState }): TickResult {
  const next: Board = board.slice();
  const out = { w: { ...snails.w }, b: { ...snails.b } };
  const moves: SnailMove[] = [];

  for (const color of ['w', 'b'] as const) {
    const enemy: Color = color === 'w' ? 'b' : 'w';
    const target = findKing(next, enemy);
    if (!target) continue;
    const snail = out[color];
    const to = nextSnailStep(snail.square, target, out[enemy].square);
    if (to === snail.square) continue;
    const idx = sqIndex(to);
    const crushed = next[idx] ?? undefined;
    next[idx] = null;
    moves.push({ color, from: snail.square, to, ...(crushed ? { crushed } : {}) });
    snail.square = to;
    if (crushed?.type === 'k') {
      return { board: next, snails: out, moves, crushedKing: crushed.color };
    }
  }
  return { board: next, snails: out, moves, crushedKing: null };
}
