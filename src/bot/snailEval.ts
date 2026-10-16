import type { Move } from 'chess.js';
import { applyMove, getLegalMoves, turn } from '../engine/game';
import { legalMoves, inCheck } from '../engine/boardValidator';
import { coordsToSq, findKing, opposite, parseFen, sqIndex, sqToCoords, type Board } from '../engine/fen';
import { chebyshev, nextSnailStep, pliesUntilTick } from '../engine/snailEngine';
import type { Color, ImmortalChessState, MoveInput, Square } from '../engine/types';

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
  /**
   * Penalty for a king near the enemy snail with nowhere to run (e.g. castled behind its own
   * pawns as the snail arrives). Scaled by how close the snail is.
   */
  boxedPenalty: number;
  /**
   * Scale for the escape term (see stepsSurvived): the long-range term, since the search only sees
   * a few plies but the snail's arrival is predictable many moves out.
   */
  escapeScale: number;
}

export const DEFAULT_WEIGHTS: SnailWeights = {
  alpha: 120,
  beta: 80,
  exponent: 1.5,
  pathPenalty: 60,
  imminentPenalty: 400,
  boxedPenalty: 350,
  escapeScale: 1,
};

const BOXED_URGENCY: Record<number, number> = { 1: 1, 2: 0.7, 3: 0.35 };

/**
 * King flight squares that get out of the snail's reach: on the board, not a snail, not our own
 * piece, and not adjacent to where the snail steps next. Attacks are ignored (cheap heuristic).
 */
function flightSquares(board: Board, king: Square, color: Color, snailNext: Square, snails: Square[]): number {
  const [kf, kr] = sqToCoords(king);
  let n = 0;
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const f = kf + df;
      const r = kr + dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      const sq = coordsToSq(f, r);
      if (snails.includes(sq) || board[r * 8 + f]?.color === color) continue;
      if (chebyshev(sq, snailNext) >= 2) n++;
    }
  }
  return n;
}

function boxedTerm(board: Board, king: Square, color: Color, enemySnail: Square, ownSnail: Square, w: SnailWeights): number {
  const urgency = BOXED_URGENCY[chebyshev(king, enemySnail)];
  if (!urgency) return 0;
  const next = nextSnailStep(enemySnail, king, ownSnail);
  const flights = flightSquares(board, king, color, next, [enemySnail, ownSnail]);
  const cramp = flights === 0 ? 1 : flights === 1 ? 0.4 : 0;
  return w.boxedPenalty * urgency * cramp;
}

/**
 * Penalty when a lone king can't dodge the snail past its 1st, 2nd, 3rd or 4th step from now
 * (see escapeTerm). Steeper the sooner it dies.
 */
export const ESCAPE_PENALTY = [1200, 700, 400, 200];

const CASTLE_PATHS: Record<Color, { home: Square; right: string; empty: Square[]; to: Square }[]> = {
  w: [
    { home: 'e1', right: 'K', empty: ['f1', 'g1'], to: 'g1' },
    { home: 'e1', right: 'Q', empty: ['d1', 'c1', 'b1'], to: 'c1' },
  ],
  b: [
    { home: 'e8', right: 'k', empty: ['f8', 'g8'], to: 'g8' },
    { home: 'e8', right: 'q', empty: ['d8', 'c8', 'b8'], to: 'c8' },
  ],
};

/**
 * The snail is slow but relentless, and its route is fixed: it steps toward wherever the king is.
 * The search only sees a few plies, so this plays the chase out exactly with everything but our
 * king frozen: we get our real number of moves between snail steps, and each may be a king step
 * (to an empty square), castling (if the path is clear) or a move elsewhere. Returns how many of
 * the next snail steps the king can survive at best (ESCAPE_PENALTY.length = no danger soon).
 *
 * A king boxed in by its own pieces, uncastled with the bishop still home or castled into a
 * corner behind its pawns, comes out short long before the crush is visible to the search, and
 * moves that open a way out (developing the bishop, castling, a pawn step) score better at once.
 */
function stepsSurvived(board: Board, king: Square, color: Color, castling: string, enemySnail: Square, ownSnail: Square, movesBeforeTick: number): number {
  const horizon = ESCAPE_PENALTY.length;
  // Standing still, the king lasts `distance` snail steps.
  if (chebyshev(king, enemySnail) > horizon) return horizon;
  const memo = new Map<number, number>();
  const free = (sq: Square) => sq !== enemySnail && sq !== ownSnail && !board[sqIndex(sq)];
  const go = (k: Square, s: Square, moves: number, done: number): number => {
    if (done === horizon) return done;
    const key = ((sqIndex(k) * 64 + sqIndex(s)) * 4 + moves) * 8 + done;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let best: number;
    if (moves === 0) {
      const next = nextSnailStep(s, k, ownSnail);
      best = next === k ? done : go(k, next, 3, done + 1);
    } else {
      best = go(k, s, moves - 1, done); // a move elsewhere
      const [kf, kr] = sqToCoords(k);
      for (let df = -1; df <= 1 && best < horizon; df++) {
        for (let dr = -1; dr <= 1 && best < horizon; dr++) {
          const f = kf + df;
          const r = kr + dr;
          if ((!df && !dr) || f < 0 || f > 7 || r < 0 || r > 7) continue;
          const sq = coordsToSq(f, r);
          if (free(sq) || (sq === king && k !== king)) best = Math.max(best, go(sq, s, moves - 1, done));
        }
      }
      for (const c of CASTLE_PATHS[color]) {
        if (best < horizon && k === c.home && k === king && castling.includes(c.right) && c.empty.every(free)) {
          best = Math.max(best, go(c.to, s, moves - 1, done));
        }
      }
    }
    memo.set(key, best);
    return best;
  };
  return go(king, enemySnail, movesBeforeTick, 0);
}

function escapeTerm(board: Board, king: Square, color: Color, castling: string, enemySnail: Square, ownSnail: Square, movesBeforeTick: number): number {
  const survived = stepsSurvived(board, king, color, castling, enemySnail, ownSnail, movesBeforeTick);
  return survived >= ESCAPE_PENALTY.length ? 0 : ESCAPE_PENALTY[survived];
}

/** How much the escape term is hurting the side to move right now (0 = the snail is no worry yet). */
export function kingDanger(state: ImmortalChessState): number {
  const color = turn(state);
  const { board, castling } = parseFen(state.fen);
  const king = findKing(board, color);
  if (!king) return 0;
  const moves = countMovesBeforeTick(color, color, pliesUntilTick(state.plyCount));
  return escapeTerm(board, king, color, castling, state.snails[opposite(color)].square, state.snails[color].square, moves);
}

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
  const { board, castling } = parseFen(state.fen);
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
  score -= boxedTerm(board, ownKing, color, enemySnail, ownSnail, w);
  score += boxedTerm(board, enemyKing, enemy, ownSnail, enemySnail, w) / 2;
  const toMove = turn(state);
  score -= escapeTerm(board, ownKing, color, castling, enemySnail, ownSnail, countMovesBeforeTick(toMove, color, plies)) * w.escapeScale;
  score += (escapeTerm(board, enemyKing, enemy, castling, ownSnail, enemySnail, countMovesBeforeTick(toMove, enemy, plies)) * w.escapeScale) / 2;

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


