import { parseFen, sqIndex } from './fen';
import type { GameRules, ImmortalChessState } from './types';

/**
 * Bridges to the Fairy-Stockfish fork (github.com/sirsigmund79/snail-fairy-stockfish), where
 * each rule set is its own variant and the snails are pieces in the FEN: 'S' is White's snail
 * (it hunts the Black king), 's' is Black's.
 */

/** Variant name in the engine, e.g. "snail-3-d-u" for the standard rules. */
export function fairyVariant(rules: GameRules): string {
  return `snail-${rules.movesPerTick}-${rules.movement === 'straight' ? 's' : 'd'}-${rules.strength === 'weak' ? 'w' : 'u'}`;
}

/**
 * The position as the engine reads it: snails on the board, and the full-move number worked out
 * from the ply count, because the engine times snail steps from it.
 */
export function toFairyFen(state: Pick<ImmortalChessState, 'fen' | 'snails' | 'plyCount'>): string {
  const p = parseFen(state.fen);
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const i = rank * 8 + file;
      const snail = i === sqIndex(state.snails.w.square) ? 'S' : i === sqIndex(state.snails.b.square) ? 's' : '';
      const piece = p.board[i];
      const ch = snail || (piece ? (piece.color === 'w' ? piece.type.toUpperCase() : piece.type) : '');
      if (!ch) {
        empty++;
        continue;
      }
      if (empty) row += empty;
      empty = 0;
      row += ch;
    }
    rows.push(row + (empty || ''));
  }
  const [, turn, castling, ep, halfmove] = state.fen.split(' ');
  return `${rows.join('/')} ${turn} ${castling} ${ep} ${halfmove} ${Math.floor(state.plyCount / 2) + 1}`;
}
