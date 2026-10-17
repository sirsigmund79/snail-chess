/**
 * One online game: a Durable Object per room code, using the WebSocket Hibernation API so an idle
 * room costs nothing between moves (the object sleeps; sockets stay open).
 *
 * Storage (survives hibernation and restarts): `seats` (playerId per colour), `game` (rematch
 * counter), `rules` (the host's variant, kept across rematches), `moves`, and `state` (the engine state after those moves, so waking up doesn't mean
 * replaying the game). Rooms delete themselves a day after everyone has left.
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './index';
import { applyMove, createGame, IllegalMoveError, resign } from '../src/engine/game';
import type { Color, GameRules, ImmortalChessState, MoveInput } from '../src/engine/types';
import { cleanRules, LIMITS, type ClientMessage, type RoomState, type Seat, type ServerMessage } from '../src/network/protocol';

const EXPIRE_MS = 24 * 60 * 60 * 1000;
const SQUARE = /^[a-h][1-8]$/;

/** Kept on each socket so it survives hibernation. Seats are looked up from storage, so a rematch
 * (which swaps colours) never leaves a socket with a stale seat. */
interface Attachment {
  playerId: string;
}

interface Stored {
  seats: Partial<Record<Color, string>>;
  game: number;
  rules: GameRules;
  moves: MoveInput[];
  resigned?: Color;
}

export class Room extends DurableObject<Env> {
  private data: Stored = { seats: {}, game: 0, rules: cleanRules(null), moves: [] };
  /** Replayed lazily after a wake-up; kept in memory while the object is awake. */
  private state: ImmortalChessState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Keepalive pings are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => {
      const [seats, game, rules, moves, state, resigned] = await Promise.all([
        ctx.storage.get<Stored['seats']>('seats'),
        ctx.storage.get<number>('game'),
        ctx.storage.get<GameRules>('rules'),
        ctx.storage.get<MoveInput[]>('moves'),
        ctx.storage.get<ImmortalChessState>('state'),
        ctx.storage.get<Color>('resigned'),
      ]);
      this.data = { seats: seats ?? {}, game: game ?? 0, rules: cleanRules(rules), moves: moves ?? [], ...(resigned ? { resigned } : {}) };
      // States stored before variants existed have no rules; replay those.
      if (state?.rules && state.plyCount === this.data.moves.length) this.state = state;
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (this.ctx.getWebSockets().length >= LIMITS.maxSockets) return new Response('Room is full', { status: 429 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    void request;
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > LIMITS.maxMessageBytes) return ws.close(1009, 'Message too large');
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return ws.close(1003, 'Bad message');
    }
    const att = ws.deserializeAttachment() as Attachment | null;

    if (msg.type === 'hello') {
      if (typeof msg.playerId !== 'string' || !/^[\w-]{8,64}$/.test(msg.playerId)) return ws.close(1003, 'Bad player id');
      await this.claimSeat(msg.playerId);
      ws.serializeAttachment({ playerId: msg.playerId } satisfies Attachment);
      await this.touch();
      return this.broadcast();
    }
    if (!att) return ws.close(1003, 'Say hello first');

    if (msg.type === 'move') {
      const state = this.current();
      const seat = this.seatOf(att.playerId);
      const toMove: Color = state.plyCount % 2 === 0 ? 'w' : 'b';
      if (seat !== toMove || msg.ply !== this.data.moves.length || this.data.moves.length >= LIMITS.maxMoves) {
        return this.send(ws, this.stateFor(ws)); // out of sync or not your turn: resync the client
      }
      const move = cleanMove(msg.move);
      if (!move) return this.send(ws, this.stateFor(ws));
      try {
        this.state = applyMove(state, move);
      } catch (e) {
        if (!(e instanceof IllegalMoveError)) throw e;
        return this.send(ws, this.stateFor(ws));
      }
      this.data.moves.push(move);
      await this.ctx.storage.put({ moves: this.data.moves, state: this.state });
      return this.broadcast();
    }

    if (msg.type === 'resign') {
      const seat = this.seatOf(att.playerId);
      if (seat === 'spectator' || msg.game !== this.data.game || this.current().gameStatus !== 'in_progress') {
        return this.send(ws, this.stateFor(ws));
      }
      this.data.resigned = seat;
      this.state = resign(this.current(), seat);
      await this.ctx.storage.put({ resigned: seat, state: this.state });
      return this.broadcast();
    }

    if (msg.type === 'seat') {
      // Only the host, before anyone else has taken a seat or a move has been played.
      const seat = this.seatOf(att.playerId);
      const want = msg.color;
      if ((want === 'w' || want === 'b') && seat !== 'spectator' && seat !== want && !this.data.seats[want] && this.data.moves.length === 0) {
        this.data.seats = { [want]: att.playerId };
        await this.ctx.storage.put('seats', this.data.seats);
      }
      return this.broadcast();
    }

    if (msg.type === 'rules') {
      // Same window as picking a colour: the host, before their friend joins or a move is played.
      const seat = this.seatOf(att.playerId);
      const other: Color = seat === 'w' ? 'b' : 'w';
      if (seat !== 'spectator' && !this.data.seats[other] && this.data.moves.length === 0) {
        this.data.rules = cleanRules(msg.rules);
        this.state = null;
        await this.ctx.storage.put('rules', this.data.rules);
        await this.ctx.storage.delete('state');
      }
      return this.broadcast();
    }

    if (msg.type === 'rematch') {
      const seat = this.seatOf(att.playerId);
      if (seat === 'spectator' || msg.game !== this.data.game || this.current().gameStatus === 'in_progress') {
        return this.send(ws, this.stateFor(ws));
      }
      const { w, b } = this.data.seats;
      this.data = { seats: { w: b, b: w }, game: this.data.game + 1, rules: this.data.rules, moves: [] };
      this.state = null;
      await this.ctx.storage.put({ seats: this.data.seats, game: this.data.game, moves: [] });
      await this.ctx.storage.delete(['state', 'resigned']);
      return this.broadcast();
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye');
    } catch {
      // already closed
    }
    this.broadcast(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.broadcast(ws);
  }

  /** A day after the last join, forget the room, unless someone is still connected. */
  async alarm() {
    if (this.ctx.getWebSockets().length > 0) return this.touch();
    await this.ctx.storage.deleteAll();
    this.data = { seats: {}, game: 0, rules: cleanRules(null), moves: [] };
    this.state = null;
    for (const ws of this.ctx.getWebSockets()) ws.close(1001, 'Room expired');
  }

  private async touch() {
    await this.ctx.storage.setAlarm(Date.now() + EXPIRE_MS);
  }

  private current(): ImmortalChessState {
    if (!this.state) {
      let s = createGame({ rules: this.data.rules });
      for (const m of this.data.moves) s = applyMove(s, m);
      this.state = this.data.resigned ? resign(s, this.data.resigned) : s;
    }
    return this.state;
  }

  private seatOf(playerId: string): Seat {
    if (this.data.seats.w === playerId) return 'w';
    if (this.data.seats.b === playerId) return 'b';
    return 'spectator';
  }

  /** Returning players keep their colour; the first two newcomers take White, then Black. */
  private async claimSeat(playerId: string) {
    if (this.seatOf(playerId) !== 'spectator') return;
    const free = (['w', 'b'] as const).find((c) => !this.data.seats[c]);
    if (!free) return;
    this.data.seats[free] = playerId;
    await this.ctx.storage.put('seats', this.data.seats);
  }

  private stateFor(ws: WebSocket, closing?: WebSocket): RoomState {
    const att = ws.deserializeAttachment() as Attachment | null;
    const online = { w: false, b: false };
    for (const s of this.ctx.getWebSockets()) {
      if (s === closing) continue;
      const a = s.deserializeAttachment() as Attachment | null;
      const seat = a && this.seatOf(a.playerId);
      if (seat === 'w' || seat === 'b') online[seat] = true;
    }
    return {
      type: 'state',
      game: this.data.game,
      moves: this.data.moves,
      rules: this.data.rules,
      resigned: this.data.resigned ?? null,
      you: att ? this.seatOf(att.playerId) : 'spectator',
      seats: {
        w: { taken: !!this.data.seats.w, online: online.w },
        b: { taken: !!this.data.seats.b, online: online.b },
      },
    };
  }

  private broadcast(closing?: WebSocket) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === closing || !ws.deserializeAttachment()) continue;
      this.send(ws, this.stateFor(ws, closing));
    }
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // socket went away mid-send; its close handler will tidy up
    }
  }
}

function cleanMove(m: unknown): MoveInput | null {
  if (!m || typeof m !== 'object') return null;
  const { from, to, promotion } = m as Record<string, unknown>;
  if (typeof from !== 'string' || typeof to !== 'string' || !SQUARE.test(from) || !SQUARE.test(to)) return null;
  if (promotion !== undefined && !(typeof promotion === 'string' && 'nbrq'.includes(promotion) && promotion.length === 1)) return null;
  return { from, to, ...(promotion ? { promotion } : {}) } as MoveInput;
}
