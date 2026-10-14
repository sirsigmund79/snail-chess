import type { Color, MoveInput } from '../engine/types';

/**
 * Wire messages. Moves are sent as UCI-style inputs; snail ticks are deterministic given the
 * move list, but the host also broadcasts an authoritative snapshot (see engine toSnapshot)
 * after every tick so clients can detect and repair divergence.
 */
export type NetMessage =
  | { type: 'join'; playerId: string }
  | { type: 'assign'; color: Color | 'spectator' }
  | { type: 'move'; ply: number; move: MoveInput }
  | { type: 'snapshot'; ply: number; snapshot: string }
  | { type: 'resign'; color: Color };

export interface GameTransport {
  readonly roomId: string;
  connect(): Promise<void>;
  send(msg: NetMessage): void;
  onMessage(handler: (msg: NetMessage) => void): () => void;
  close(): void;
}

/**
 * Placeholder until the PartyKit room server lands. Echo-free and offline: local games use the
 * engine directly, so nothing needs to be sent.
 */
export class LocalTransport implements GameTransport {
  private handlers = new Set<(msg: NetMessage) => void>();
  constructor(readonly roomId: string) {}
  async connect() {}
  send(msg: NetMessage) {
    void msg;
  }
  onMessage(handler: (msg: NetMessage) => void) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  close() {
    this.handlers.clear();
  }
}
