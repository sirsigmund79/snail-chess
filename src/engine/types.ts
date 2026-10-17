import type { Square } from 'chess.js';

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type { Square };

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface SnailState {
  square: Square;
  /** White snail hunts the Black king; Black snail hunts the White king. */
  color: Color;
}

export type GameStatus =
  | 'in_progress'
  | 'checkmate'
  | 'snail_win_white'
  | 'snail_win_black'
  | 'draw'
  | 'resigned';

export type DrawReason =
  | 'stalemate'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'insufficient_material'
  /** Both snails crushed both kings in the same snail move. */
  | 'both_kings_crushed';

export interface SnailMove {
  color: Color;
  from: Square;
  to: Square;
  /** Piece crushed on the landing square, if any. */
  crushed?: Piece;
}

export interface TickEvent {
  /** Ply count at which this tick happened. */
  ply: number;
  moves: SnailMove[];
}

export interface MoveInput {
  from: Square;
  to: Square;
  promotion?: Exclude<PieceType, 'p' | 'k'>;
}

export interface MoveRecord extends MoveInput {
  san: string;
  color: Color;
  piece: PieceType;
  captured?: PieceType;
  /** FEN after the move and any snail tick that followed it. */
  fenAfter: string;
  /** FEN right after the move, before the snail tick (only set when a tick followed). */
  fenBeforeTick?: string;
  tick?: TickEvent;
}

/** Variant rules, picked by the host of an online game. Local games always use DEFAULT_RULES. */
export interface GameRules {
  /** Full moves (one by each side) between snail steps. */
  movesPerTick: 2 | 3 | 4;
  /** 'diagonal': one king step along the shortest path. 'straight': rook-like steps only. */
  movement: 'diagonal' | 'straight';
  /**
   * 'unstoppable': crush whatever is on the landing square. 'weak': only the hunted king can be
   * crushed; any other piece is in the way, so the snail steps along the new shortest path around it.
   */
  strength: 'unstoppable' | 'weak';
}

export const DEFAULT_RULES: GameRules = { movesPerTick: 3, movement: 'diagonal', strength: 'unstoppable' };

export interface ImmortalChessState {
  rules: GameRules;
  fen: string;
  /** Number of half-moves played. A snail tick happens whenever this hits a multiple of 2 × movesPerTick. */
  plyCount: number;
  snails: { w: SnailState; b: SnailState };
  gameStatus: GameStatus;
  winner: Color | null;
  drawReason?: DrawReason;
  /** Human-readable explanation of how the game ended. */
  endReason?: string;
  history: MoveRecord[];
  /** Repetition counts keyed by position (board, turn, castling, ep, snails). */
  positionCounts: Record<string, number>;
}

/** Plies between ticks under the default rules; see tickInterval() for the variants. */
export const TICK_INTERVAL = 6;
export const DEFAULT_SNAILS: { w: Square; b: Square } = { w: 'a4', b: 'a5' };
