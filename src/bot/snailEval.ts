import type { Move } from 'chess.js';
import { applyMove, getLegalMoves, turn } from '../engine/game';
import { legalMoves, inCheck } from '../engine/boardValidator';
import { findKing, opposite, parseFen } from '../engine/fen';
import { chebyshev, nextSnailStep, pliesUntilTick } from '../engine/snailEngine';
import type { Color, ImmortalChessState, MoveInput } from '../engine/types';

export const MATE = 100_000;

export interface SnailWeights {
  /** Penalty scale for our king near the enemy snail: alpha / dist^exponent. */
  alpha: number;
  /** Bonus scale for the enemy king near our snail. */
  beta: number;
  exponent: number;
  /** Extra penalty when our king sits on (or next to) the enemy snail's upcoming path. */
  pathPenalty: number;
  /** Penalty when the enemy snail is adjacent and the tick is about to fire. */
  imminentPenalty: number;
}

export const DEFAULT_WEIGHTS: SnailWeights = {
  alpha: 120,
  beta: 80,
  exponent: 1.5,
  pathPenalty: 60,
  imminentPenalty: 400,
};

const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/** Material + a little centralisation/pawn advancement, from `color`'s point of view. */
export function materialEval(fen: string, color: Color): number {
  const { board } = parseFen(fen);
  let score = 0;
  board.forEach((piece, i) => {
    if (!piece) return;
    const file = i % 8;
    const rank = Math.floor(i / 8);
    let v = VALUES[piece.type];
    if (piece.type === 'p') v += (piece.color === 'w' ? rank - 1 : 6 - rank) * 6;
    else if (piece.type !== 'k') v += 12 - 3 * (Math.abs(3.5 - file) + Math.abs(3.5 - rank));
    score += piece.color === color ? v : -v;
  });
  return score;
}

/** Snail-specific terms (spec Part 2, Method 1) from `color`'s point of view. */
export function snailEval(
  state: ImmortalChessState,
  color: Color,
  w: SnailWeights = DEFAULT_WEIGHTS,
): number {
  const { board } = parseFen(state.fen);
  const enemy = opposite(color);
  const ownKing = findKing(board, color);
  const enemyKing = findKing(board, enemy);
  if (!ownKing || !enemyKing) return 0;
  const enemySnail = state.snails[enemy].square;
  const ownSnail = state.snails[color].square;
  const dOwn = Math.max(1, chebyshev(ownKing, enemySnail));
  const dEnemy = Math.max(1, chebyshev(enemyKing, ownSnail));
  const plies = pliesUntilTick(state.plyCount);

  let score = -w.alpha / dOwn ** w.exponent + w.beta / dEnemy ** w.exponent;

  // Our king standing on the enemy snail's next two steps is a trap waiting to close.
  const step1 = nextSnailStep(enemySnail, ownKing, ownSnail);
  const step2 = nextSnailStep(step1, ownKing, ownSnail);
  if (step1 === ownKing) {
    // Snail is adjacent. Lethal if the tick fires before we can step away.
    const ourMovesBeforeTick = countMovesBeforeTick(turn(state), color, plies);
    score -= ourMovesBeforeTick === 0 ? MATE / 2 : w.imminentPenalty / ourMovesBeforeTick;
  } else if (step2 === ownKing) {
    score -= w.pathPenalty;
  }
  const eStep1 = nextSnailStep(ownSnail, enemyKing, enemySnail);
  if (eStep1 === enemyKing) {
    const theirMoves = countMovesBeforeTick(turn(state), enemy, plies);
    score += theirMoves === 0 ? MATE / 2 : w.imminentPenalty / (2 * theirMoves);
  }
  return score;
}

/** How many moves `color` gets before the next tick, given the side to move. */
function countMovesBeforeTick(toMove: Color, color: Color, plies: number): number {
  // Plies alternate starting with `toMove`; count those belonging to `color`.
  return toMove === color ? Math.ceil(plies / 2) : Math.floor(plies / 2);
}

export function evaluate(state: ImmortalChessState, color: Color, w = DEFAULT_WEIGHTS): number {
  return materialEval(state.fen, color) + snailEval(state, color, w);
}

export const toInput = (m: Move): MoveInput => ({
  from: m.from,
  to: m.to,
  ...(m.promotion ? { promotion: m.promotion as MoveInput['promotion'] } : {}),
});

function orderMoves(moves: Move[]): Move[] {
  return moves
    .map((m) => ({ m, k: (m.captured ? VALUES[m.captured] * 10 - VALUES[m.piece] : 0) + (m.promotion ? 800 : 0) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.m);
}

export interface SearchStats {
  nodes: number;
}

/**
 * Negamax alpha-beta over the full snail-aware rules (ticks, crushes, impassable squares).
 * Returns a score from the side-to-move's perspective.
 */
export function negamax(
  state: ImmortalChessState,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  w: SnailWeights,
  stats: SearchStats,
): number {
  stats.nodes++;
  const side = turn(state);
  if (state.gameStatus !== 'in_progress') {
    if (state.winner === side) return MATE - ply;
    if (state.winner) return -(MATE - ply);
    return 0;
  }
  // Leaves skip move generation (the expensive part); mate/stalemate is found one ply earlier.
  if (depth <= 0) return evaluate(state, side, w);
  const moves = legalMoves(state.fen, state.snails);
  if (moves.length === 0) return inCheck(state.fen, state.snails) ? -(MATE - ply) : 0;

  let best = -Infinity;
  for (const m of orderMoves(moves)) {
    const child = applyMove(state, toInput(m), { fast: true, legal: moves });
    const score = -negamax(child, depth - 1, -beta, -alpha, ply + 1, w, stats);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

export interface ScoredMove {
  move: MoveInput;
  san?: string;
  score: number;
}

/** Score each root move with a snail-aware lookahead. */
export function scoreMoves(
  state: ImmortalChessState,
  depth: number,
  w: SnailWeights = DEFAULT_WEIGHTS,
  only?: MoveInput[],
): { scored: ScoredMove[]; nodes: number } {
  const legal = getLegalMoves(state);
  const stats = { nodes: 0 };
  const pool = only
    ? legal.filter((m) => only.some((o) => o.from === m.from && o.to === m.to && o.promotion === (m.promotion ?? undefined)))
    : legal;
  const scored = orderMoves(pool).map((m) => {
    const child = applyMove(state, toInput(m), { fast: true, legal });
    const score = -negamax(child, depth - 1, -Infinity, Infinity, 1, w, stats);
    return { move: toInput(m), san: m.san, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return { scored, nodes: stats.nodes };
}


