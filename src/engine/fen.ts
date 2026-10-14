import type { Color, Piece, PieceType, Square } from './types';

/** Board indexed 0..63 with index = rank * 8 + file (a1 = 0, h8 = 63). */
export type Board = (Piece | null)[];

export interface ParsedFen {
  board: Board;
  turn: Color;
  castling: string;
  ep: Square | null;
  halfmove: number;
  fullmove: number;
}

export const FILES = 'abcdefgh';

export function sqToCoords(sq: Square): [file: number, rank: number] {
  return [sq.charCodeAt(0) - 97, sq.charCodeAt(1) - 49];
}

export function coordsToSq(file: number, rank: number): Square {
  return (FILES[file] + (rank + 1)) as Square;
}

export function onBoard(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

export function sqIndex(sq: Square): number {
  const [f, r] = sqToCoords(sq);
  return r * 8 + f;
}

export function indexToSq(i: number): Square {
  return coordsToSq(i % 8, Math.floor(i / 8));
}

export function parseFen(fen: string): ParsedFen {
  const [placement, turn = 'w', castling = '-', ep = '-', half = '0', full = '1'] = fen
    .trim()
    .split(/\s+/);
  const board: Board = new Array(64).fill(null);
  const rows = placement.split('/');
  if (rows.length !== 8) throw new Error(`Invalid FEN placement: ${fen}`);
  rows.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
      } else {
        const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
        board[rank * 8 + file] = { type: ch.toLowerCase() as PieceType, color };
        file++;
      }
    }
    if (file !== 8) throw new Error(`Invalid FEN row "${row}" in ${fen}`);
  });
  return {
    board,
    turn: turn as Color,
    castling,
    ep: ep === '-' ? null : (ep as Square),
    halfmove: Number(half),
    fullmove: Number(full),
  };
}

export function serializeFen(p: ParsedFen): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = p.board[rank * 8 + file];
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) row += empty;
      empty = 0;
      row += piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return [rows.join('/'), p.turn, p.castling || '-', p.ep ?? '-', p.halfmove, p.fullmove].join(' ');
}

/** Drop castling rights whose king or rook is no longer on its home square. */
export function sanitizeCastling(p: ParsedFen): string {
  const at = (sq: Square) => p.board[sqIndex(sq)];
  const is = (sq: Square, type: PieceType, color: Color) => {
    const piece = at(sq);
    return piece?.type === type && piece.color === color;
  };
  let out = '';
  for (const ch of p.castling === '-' ? '' : p.castling) {
    const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
    const rank = color === 'w' ? '1' : '8';
    const kingOk = is(`e${rank}` as Square, 'k', color);
    const rookSq = (ch.toLowerCase() === 'k' ? `h${rank}` : `a${rank}`) as Square;
    if (kingOk && is(rookSq, 'r', color)) out += ch;
  }
  return out || '-';
}

export function findKing(board: Board, color: Color): Square | null {
  const i = board.findIndex((p) => p?.type === 'k' && p.color === color);
  return i === -1 ? null : indexToSq(i);
}

export const opposite = (c: Color): Color => (c === 'w' ? 'b' : 'w');
