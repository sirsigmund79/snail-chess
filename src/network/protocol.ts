import { DEFAULT_RULES, type Color, type GameRules, type MoveInput } from '../engine/types';

/**
 * Online play wire format (JSON over one WebSocket per player, /api/room/:code/ws).
 *
 * The room server (worker/room.ts) is authoritative: it keeps the move list, replays it through
 * the same rules engine, and rejects illegal or out-of-turn moves. Snail ticks are deterministic
 * given the moves, so a client rebuilds the whole game from `moves` and animates only what's new.
 */
export type Seat = Color | 'spectator';

export type ClientMessage =
  | { type: 'hello'; playerId: string }
  /** `ply` is the number of moves the client had seen, so stale moves are dropped. */
  | { type: 'move'; ply: number; move: MoveInput }
  /** Only once the game is over: start a new game with colours swapped. */
  | { type: 'rematch'; game: number }
  /** Give up the current game. */
  | { type: 'resign'; game: number }
  /** Before anyone else has joined: switch to the other colour. */
  | { type: 'seat'; color: Color }
  /** Before anyone else has joined: pick the variant rules. They carry over to rematches. */
  | { type: 'rules'; rules: GameRules };

export interface RoomState {
  type: 'state';
  /** Increments on every rematch. */
  game: number;
  moves: MoveInput[];
  rules: GameRules;
  /** Who resigned this game, if anyone. */
  resigned: Color | null;
  you: Seat;
  /** Whether each seat is taken, and whether that player is connected right now. */
  seats: Record<Color, { taken: boolean; online: boolean }>;
}

export type ServerMessage = RoomState | { type: 'error'; message: string };

export const roomSocketPath = (code: string) => `/api/room/${code}/ws`;

/** Hard limits, shared so the client never sends what the server would drop. */
export const LIMITS = {
  maxMessageBytes: 1024,
  maxMoves: 600,
  maxSockets: 12,
};

/** Validate rules from the wire (or storage); anything malformed falls back to the defaults. */
export function cleanRules(r: unknown): GameRules {
  if (!r || typeof r !== 'object') return DEFAULT_RULES;
  const { movesPerTick, movement, strength } = r as Record<string, unknown>;
  return {
    movesPerTick: movesPerTick === 2 || movesPerTick === 4 ? movesPerTick : 3,
    movement: movement === 'straight' ? 'straight' : 'diagonal',
    strength: strength === 'weak' ? 'weak' : 'unstoppable',
  };
}
