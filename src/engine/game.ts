import { Chess, type Move } from 'chess.js';
import { legalMoves, inCheck, kingAttacked, moveMatches, sanFor, shadowGame } from './boardValidator';
import { opposite, parseFen, sanitizeCastling, serializeFen, sqIndex, sqToCoords } from './fen';
import { applySnailTick, isTickPly } from './snailEngine';
import {
  DEFAULT_SNAILS,
  type Color,
  type ImmortalChessState,
  type MoveInput,
  type MoveRecord,
  type SnailState,
  type Square,
  type TickEvent,
} from './types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface CreateGameOptions {
  fen?: string;
  snails?: { w: Square; b: Square };
  plyCount?: number;
}

export function createGame(opts: CreateGameOptions = {}): ImmortalChessState {
  const snailSquares = opts.snails ?? DEFAULT_SNAILS;
  if (snailSquares.w === snailSquares.b) throw new Error('Snails cannot share a square');
  const snails = {
    w: { square: snailSquares.w, color: 'w' as const },
    b: { square: snailSquares.b, color: 'b' as const },
  };
  const parsed = parseFen(opts.fen ?? START_FEN);
  for (const s of [snails.w, snails.b]) {
    if (parsed.board[sqIndex(s.square)]) throw new Error(`Snail square ${s.square} is occupied`);
  }
  parsed.castling = sanitizeCastling(parsed);
  const fen = serializeFen(parsed);
  const base: ImmortalChessState = {
    fen,
    plyCount: opts.plyCount ?? 0,
    snails,
    gameStatus: 'in_progress',
    winner: null,
    history: [],
    positionCounts: {},
  };
  base.positionCounts[positionKey(base)] = 1;
  return { ...base, ...evaluateStatus(base) };
}

/** Repetition key: placement, turn, castling, en passant, snail squares, and tick phase. */
export function positionKey(s: Pick<ImmortalChessState, 'fen' | 'snails' | 'plyCount'>): string {
  const [placement, turn, castling, ep] = s.fen.split(' ');
  return `${placement} ${turn} ${castling} ${ep} ${s.snails.w.square}${s.snails.b.square} ${s.plyCount % 6}`;
}

export function turn(state: ImmortalChessState): Color {
  return state.fen.split(' ')[1] as Color;
}

export function getLegalMoves(state: ImmortalChessState) {
  if (state.gameStatus !== 'in_progress') return [];
  return legalMoves(state.fen, state.snails);
}

type StatusFields = Pick<ImmortalChessState, 'gameStatus' | 'winner' | 'drawReason' | 'endReason'>;

function evaluateStatus(
  state: Pick<ImmortalChessState, 'fen' | 'snails' | 'plyCount' | 'positionCounts'>,
): StatusFields {
  const side = state.fen.split(' ')[1] as Color;
  const enemy = opposite(side);
  if (kingAttacked(state.fen, state.snails, enemy)) {
    return {
      gameStatus: 'checkmate',
      winner: side,
      endReason: `The snail exposed ${enemy === 'w' ? 'White' : 'Black'}'s king to capture`,
    };
  }
  const moves = legalMoves(state.fen, state.snails);
  if (moves.length === 0) {
    if (inCheck(state.fen, state.snails)) {
      return { gameStatus: 'checkmate', winner: enemy, endReason: 'Checkmate' };
    }
    return { gameStatus: 'draw', winner: null, drawReason: 'stalemate', endReason: 'Stalemate' };
  }
  if (Number(state.fen.split(' ')[4]) >= 100) {
    return { gameStatus: 'draw', winner: null, drawReason: 'fifty_move_rule', endReason: '50-move rule' };
  }
  if ((state.positionCounts[positionKey(state)] ?? 0) >= 3) {
    return {
      gameStatus: 'draw',
      winner: null,
      drawReason: 'threefold_repetition',
      endReason: 'Threefold repetition',
    };
  }
  if (new Chess(state.fen, { skipValidation: true }).isInsufficientMaterial()) {
    return {
      gameStatus: 'draw',
      winner: null,
      drawReason: 'insufficient_material',
      endReason: 'Insufficient material',
    };
  }
  return { gameStatus: 'in_progress', winner: null };
}

export class IllegalMoveError extends Error {}

export interface ApplyOptions {
  /** Precomputed legal moves for `state` (saves a move generation). */
  legal?: Move[];
  /**
   * Search mode: skip SAN, repetition tracking and full status evaluation. Only snail crushes
   * and snail-exposed kings end the game; the caller detects mate/stalemate from move lists.
   */
  fast?: boolean;
}

/**
 * Play a move: validate against snail-aware rules, advance the ply counter, run the snail tick
 * when due, and recompute game status. Returns a new state; the input is not mutated.
 */
export function applyMove(
  state: ImmortalChessState,
  input: MoveInput,
  opts: ApplyOptions = {},
): ImmortalChessState {
  if (state.gameStatus !== 'in_progress') throw new IllegalMoveError('Game is over');
  const legal = opts.legal ?? legalMoves(state.fen, state.snails);
  const move = legal.find((m) => moveMatches(m, input));
  if (!move) {
    throw new IllegalMoveError(
      `Illegal move ${input.from}${input.to}${input.promotion ?? ''} in ${state.fen}`,
    );
  }

  const shadow = shadowGame(state.fen, state.snails);
  shadow.move({ from: move.from, to: move.to, promotion: move.promotion });
  const parsed = parseFen(shadow.fen());
  for (const s of [state.snails.w, state.snails.b]) parsed.board[sqIndex(s.square)] = null;
  parsed.castling = sanitizeCastling(parsed);
  let fen = serializeFen(parsed);

  // SAN suffix from the position right after the move (before any tick).
  let san = '';
  if (!opts.fast) {
    const replyMoves = legalMoves(fen, state.snails);
    const checked = inCheck(fen, state.snails);
    san = sanFor(move, legal, checked ? (replyMoves.length ? '+' : '#') : '');
  }

  const plyCount = state.plyCount + 1;
  let snails = state.snails;
  let tick: TickEvent | undefined;
  let crushedKing: Color | null = null;
  let fenBeforeTick: string | undefined;
  if (isTickPly(plyCount)) {
    fenBeforeTick = fen;
    const result = applySnailTick(parsed.board, snails);
    snails = result.snails;
    crushedKing = result.crushedKing;
    tick = { ply: plyCount, moves: result.moves };
    parsed.board = result.board;
    parsed.castling = sanitizeCastling(parsed);
    if (parsed.ep && !epStillValid(parsed, snails)) parsed.ep = null;
    fen = serializeFen(parsed);
  }

  const record: MoveRecord = {
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion as MoveInput['promotion'] } : {}),
    san,
    color: move.color,
    piece: move.piece,
    ...(move.captured ? { captured: move.captured } : {}),
    fenAfter: fen,
    ...(tick ? { tick, fenBeforeTick } : {}),
  };

  const next: ImmortalChessState = {
    fen,
    plyCount,
    snails,
    gameStatus: 'in_progress',
    winner: null,
    history: opts.fast ? state.history : [...state.history, record],
    positionCounts: opts.fast ? state.positionCounts : { ...state.positionCounts },
  };
  if (!opts.fast) {
    const key = positionKey(next);
    next.positionCounts[key] = (next.positionCounts[key] ?? 0) + 1;
  }

  if (crushedKing) {
    const winner = opposite(crushedKing);
    return {
      ...next,
      gameStatus: winner === 'w' ? 'snail_win_white' : 'snail_win_black',
      winner,
      endReason: `A snail crushed ${crushedKing === 'w' ? 'White' : 'Black'}'s king`,
    };
  }
  if (opts.fast) {
    const side = turn(next);
    if (kingAttacked(fen, snails, opposite(side))) {
      return { ...next, gameStatus: 'checkmate', winner: side };
    }
    return next;
  }
  return { ...next, ...evaluateStatus(next) };
}

function epStillValid(p: ReturnType<typeof parseFen>, snails: { w: SnailState; b: SnailState }) {
  if (!p.ep) return false;
  if (p.ep === snails.w.square || p.ep === snails.b.square) return false;
  const [f, r] = sqToCoords(p.ep);
  // The pawn that double-pushed sits one rank beyond the ep square, from the mover's view.
  const pawnRank = r === 2 ? 3 : 4;
  const pawn = p.board[pawnRank * 8 + f];
  return pawn?.type === 'p' && pawn.color === (r === 2 ? 'w' : 'b');
}

/** Compact snapshot: `<fen> [S:<white snail>,<black snail>] [P:<plyCount>]`. */
export function toSnapshot(state: ImmortalChessState): string {
  return `${state.fen} [S:${state.snails.w.square},${state.snails.b.square}] [P:${state.plyCount}]`;
}

export function fromSnapshot(snapshot: string): ImmortalChessState {
  const m = snapshot.match(/^(.*?)\s*\[S:([a-h][1-8]),([a-h][1-8])\]\s*(?:\[P:(\d+)\])?\s*$/);
  if (!m) throw new Error(`Invalid snapshot: ${snapshot}`);
  return createGame({
    fen: m[1],
    snails: { w: m[2] as Square, b: m[3] as Square },
    plyCount: m[4] ? Number(m[4]) : 0,
  });
}
