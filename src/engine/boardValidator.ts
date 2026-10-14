import { Chess, type Move } from 'chess.js';
import {
  findKing,
  opposite,
  parseFen,
  sanitizeCastling,
  serializeFen,
  sqIndex,
  sqToCoords,
  type ParsedFen,
} from './fen';
import type { Color, MoveInput, PieceType, SnailState, Square } from './types';

/**
 * chess.js knows nothing about snails, so we generate moves on a *shadow* position where each
 * snail square holds a virtual blocker belonging to `blockerColor`. When the blockers belong to
 * the side to move, chess.js automatically:
 *   - forbids landing on a snail (own piece) and sliding / double-pushing / castling through it,
 *   - lets the snail block enemy lines of attack on our king,
 *   - ignores the blocker's own attacks for our king's safety.
 * Moves *from* blocker squares are discarded afterwards.
 *
 * The blocker is a knight unless a knight there would attack the enemy king, in which case a
 * bishop is used (a knight-jump square is never on a bishop line). That keeps the shadow FEN a
 * legal position for Stockfish too.
 */
export function shadowFen(
  fen: string,
  snails: { w: SnailState; b: SnailState },
  blockerColor?: Color,
): string {
  const p = parseFen(fen);
  return serializeFen(withBlockers(p, snails, blockerColor ?? p.turn));
}

function withBlockers(
  p: ParsedFen,
  snails: { w: SnailState; b: SnailState },
  blockerColor: Color,
): ParsedFen {
  const board = p.board.slice();
  const enemyKing = findKing(board, opposite(blockerColor));
  for (const snail of [snails.w, snails.b]) {
    let type: PieceType = 'n';
    if (enemyKing) {
      const [sf, sr] = sqToCoords(snail.square);
      const [kf, kr] = sqToCoords(enemyKing);
      const df = Math.abs(sf - kf);
      const dr = Math.abs(sr - kr);
      if ((df === 1 && dr === 2) || (df === 2 && dr === 1)) type = 'b';
    }
    board[sqIndex(snail.square)] = { type, color: blockerColor };
  }
  const shadow: ParsedFen = { ...p, board };
  shadow.castling = sanitizeCastling({ ...p });
  if (shadow.ep && board[sqIndex(shadow.ep)]) shadow.ep = null;
  return shadow;
}

export function shadowGame(fen: string, snails: { w: SnailState; b: SnailState }): Chess {
  return new Chess(shadowFen(fen, snails), { skipValidation: true });
}

const isSnailSquare = (sq: Square, snails: { w: SnailState; b: SnailState }) =>
  sq === snails.w.square || sq === snails.b.square;

/** All legal moves for the side to move, respecting snails. */
export function legalMoves(fen: string, snails: { w: SnailState; b: SnailState }): Move[] {
  return shadowGame(fen, snails)
    .moves({ verbose: true })
    .filter((m) => !isSnailSquare(m.from, snails) && m.captured !== 'k');
}

export function inCheck(fen: string, snails: { w: SnailState; b: SnailState }): boolean {
  return shadowGame(fen, snails).inCheck();
}

/** Is `color`'s king attacked by the other side, with snails blocking lines? */
export function kingAttacked(
  fen: string,
  snails: { w: SnailState; b: SnailState },
  color: Color,
): boolean {
  const p = parseFen(fen);
  const king = findKing(p.board, color);
  if (!king) return false;
  // Blockers belong to the defending colour so they block but never attack.
  const shadow = withBlockers(p, snails, color);
  return new Chess(serializeFen(shadow), { skipValidation: true }).isAttacked(king, opposite(color));
}

export function moveMatches(m: Move, input: MoveInput): boolean {
  return m.from === input.from && m.to === input.to && (m.promotion ?? undefined) === input.promotion;
}

/** Build SAN using the snail-aware legal move list for disambiguation. */
export function sanFor(move: Move, legal: Move[], suffix: '' | '+' | '#'): string {
  if (move.flags.includes('k')) return 'O-O' + suffix;
  if (move.flags.includes('q')) return 'O-O-O' + suffix;
  const capture = move.flags.includes('c') || move.flags.includes('e');
  let san = '';
  if (move.piece === 'p') {
    if (capture) san += move.from[0];
  } else {
    san += move.piece.toUpperCase();
    const rivals = legal.filter(
      (m) => m.piece === move.piece && m.to === move.to && m.from !== move.from,
    );
    if (rivals.length) {
      const sameFile = rivals.some((m) => m.from[0] === move.from[0]);
      const sameRank = rivals.some((m) => m.from[1] === move.from[1]);
      if (!sameFile) san += move.from[0];
      else if (!sameRank) san += move.from[1];
      else san += move.from;
    }
  }
  if (capture) san += 'x';
  san += move.to;
  if (move.promotion) san += '=' + move.promotion.toUpperCase();
  return san + suffix;
}
