import { coordsToSq, findKing, onBoard, sqIndex, sqToCoords, type Board } from './fen';
import { DEFAULT_RULES, type Color, type GameRules, type SnailBump, type SnailMove, type SnailState, type Square } from './types';

export function chebyshev(a: Square, b: Square): number {
  const [af, ar] = sqToCoords(a);
  const [bf, br] = sqToCoords(b);
  return Math.max(Math.abs(af - bf), Math.abs(ar - br));
}

/** Steps a snail needs from `a` to `b` on an empty board under the given movement. */
export function snailDistance(a: Square, b: Square, movement: GameRules['movement'] = 'diagonal'): number {
  if (movement === 'diagonal') return chebyshev(a, b);
  const [af, ar] = sqToCoords(a);
  const [bf, br] = sqToCoords(b);
  return Math.abs(af - bf) + Math.abs(ar - br);
}

/** Plies between snail ticks: one move by each side, `movesPerTick` times. */
export function tickInterval(rules: GameRules = DEFAULT_RULES): number {
  return rules.movesPerTick * 2;
}

/** True when the ply just played (1-based count) triggers a snail tick. */
export function isTickPly(plyCount: number, rules: GameRules = DEFAULT_RULES): boolean {
  return plyCount > 0 && plyCount % tickInterval(rules) === 0;
}

/** Plies remaining until the next tick, counted from the current ply count (1..interval). */
export function pliesUntilTick(plyCount: number, rules: GameRules = DEFAULT_RULES): number {
  return tickInterval(rules) - (plyCount % tickInterval(rules));
}

/**
 * Full moves until the snails move, as players count them. Snails move right after Black's move,
 * so this is the number of Black moves left in the cycle (3, 2 or 1 under the default rules).
 */
export function movesUntilSnails(plyCount: number, rules: GameRules = DEFAULT_RULES): number {
  return Math.ceil(pliesUntilTick(plyCount, rules) / 2);
}

const KING_STEPS: [number, number][] = [];
for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) if (df || dr) KING_STEPS.push([df, dr]);
const ROOK_STEPS: [number, number][] = [[-1, 0], [0, -1], [0, 1], [1, 0]];

function neighbours(sq: Square, movement: GameRules['movement']): Square[] {
  const [f, r] = sqToCoords(sq);
  const out: Square[] = [];
  for (const [df, dr] of movement === 'diagonal' ? KING_STEPS : ROOK_STEPS) {
    if (onBoard(f + df, r + dr)) out.push(coordsToSq(f + df, r + dr));
  }
  return out;
}

/** The step a snail takes on an open board: diagonal when both axes differ, or along the longer axis (rank on a tie) when it moves straight. */
export function primaryStep(from: Square, target: Square, movement: GameRules['movement']): Square {
  const [sf, sr] = sqToCoords(from);
  const [tf, tr] = sqToCoords(target);
  const df = Math.sign(tf - sf);
  const dr = Math.sign(tr - sr);
  if (movement === 'diagonal') return coordsToSq(sf + df, sr + dr);
  return Math.abs(tf - sf) > Math.abs(tr - sr) ? coordsToSq(sf + df, sr) : coordsToSq(sf, sr + dr);
}

/** Steps from each square to `target` through squares `open` allows (Infinity when cut off). */
function distancesTo(target: Square, open: (sq: Square) => boolean, movement: GameRules['movement']): Map<Square, number> {
  const dist = new Map<Square, number>([[target, 0]]);
  const queue: Square[] = [target];
  for (let i = 0; i < queue.length; i++) {
    const d = dist.get(queue[i])! + 1;
    for (const n of neighbours(queue[i], movement)) {
      if (dist.has(n) || !open(n)) continue;
      dist.set(n, d);
      queue.push(n);
    }
  }
  return dist;
}

/**
 * Where a snail steps next. The primary step heads straight for the target (see primaryStep).
 * If the other snail is in the way, fall back to any neighbouring square that still strictly
 * shortens the distance, preferring the one closest (Euclidean) to the target, then a fixed scan
 * order. If nothing works the snail stays put.
 *
 * Weak snails (pass `board`) can't enter a square holding anything but the target king, so they
 * take the first step of the shortest path around whatever is in the way. If they are walled off
 * completely they still step to an open square that gets closer, or wait.
 */
export function nextSnailStep(
  from: Square,
  target: Square,
  blocked: Square | null,
  rules: GameRules = DEFAULT_RULES,
  board?: Board,
): Square {
  if (from === target) return from;
  const { movement } = rules;
  const weak = rules.strength === 'weak' && !!board;
  const open = (sq: Square) => sq !== blocked && (!weak || sq === target || !board![sqIndex(sq)]);

  const primary = primaryStep(from, target, movement);
  const [tf, tr] = sqToCoords(target);
  const d2 = (sq: Square) => {
    const [f, r] = sqToCoords(sq);
    return (tf - f) ** 2 + (tr - r) ** 2;
  };
  // Stable sort keeps the scan order among equally near squares.
  const options = neighbours(from, movement).sort((a, b) => (a === primary ? -1 : b === primary ? 1 : d2(a) - d2(b)));

  if (weak) {
    const dist = distancesTo(target, open, movement);
    let best: Square | null = null;
    for (const sq of options) {
      if (open(sq) && dist.has(sq) && (best === null || dist.get(sq)! < dist.get(best)!)) best = sq;
    }
    if (best) return best;
  }
  const d = snailDistance(from, target, movement);
  return options.find((sq) => open(sq) && snailDistance(sq, target, movement) < d) ?? from;
}

/** Would Black's snail land on the White king with its step this tick? */
function blackSnailTakesWhiteKing(board: Board, snails: { w: SnailState; b: SnailState }, rules: GameRules): boolean {
  const king = findKing(board, 'w');
  return !!king && nextSnailStep(snails.b.square, king, snails.w.square, rules, board) === king;
}

export interface TickResult {
  board: Board;
  snails: { w: SnailState; b: SnailState };
  moves: SnailMove[];
  /** Snails that couldn't step (in White-then-Black order, like `moves`). */
  bumps: SnailBump[];
  /** Colour of the king that was crushed, if any; 'both' if both snails got a king (a draw). */
  crushedKing: Color | 'both' | null;
}

/**
 * Advance both snails one step. White's snail resolves first; any piece on a landing square is
 * removed (with weak snails that can only be the hunted king). If White's snail crushes the Black king, Black's snail only steps if that step crushes
 * the White king too: both kings fall at once, which is a draw. Otherwise White has won.
 */
export function applySnailTick(
  board: Board,
  snails: { w: SnailState; b: SnailState },
  rules: GameRules = DEFAULT_RULES,
): TickResult {
  const next: Board = board.slice();
  const out = { w: { ...snails.w }, b: { ...snails.b } };
  const moves: SnailMove[] = [];
  const bumps: SnailBump[] = [];

  for (const color of ['w', 'b'] as const) {
    const enemy: Color = color === 'w' ? 'b' : 'w';
    const target = findKing(next, enemy);
    if (!target) continue;
    const snail = out[color];
    const to = nextSnailStep(snail.square, target, out[enemy].square, rules, next);
    if (to === snail.square) {
      if (snail.square !== target) bumps.push({ color, square: snail.square, toward: primaryStep(snail.square, target, rules.movement) });
      continue;
    }
    const idx = sqIndex(to);
    const crushed = next[idx] ?? undefined;
    next[idx] = null;
    moves.push({ color, from: snail.square, to, ...(crushed ? { crushed } : {}) });
    snail.square = to;
    if (crushed?.type === 'k') {
      if (color === 'w' && blackSnailTakesWhiteKing(next, out, rules)) {
        const from = out.b.square;
        const king = findKing(next, 'w')!;
        next[sqIndex(king)] = null;
        moves.push({ color: 'b', from, to: king, crushed: { type: 'k', color: 'w' } });
        out.b.square = king;
        return { board: next, snails: out, moves, bumps, crushedKing: 'both' };
      }
      return { board: next, snails: out, moves, bumps, crushedKing: crushed.color };
    }
  }
  return { board: next, snails: out, moves, bumps, crushedKing: null };
}
