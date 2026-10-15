import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove, createGame, IllegalMoveError, resign, turn } from '../engine/game';
import type { Color, ImmortalChessState, MoveInput } from '../engine/types';
import { gameEvents, track } from '../analytics';
import { LIMITS, roomSocketPath, type ClientMessage, type RoomState, type ServerMessage } from '../network/protocol';
import { ACTIVE_THEME } from './theme';
import { usePlayback } from './usePlayback';

/** A stable id for this browser, so a refresh or reconnect keeps your seat. */
function playerId(): string {
  const fresh = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');
  try {
    let id = localStorage.getItem('snail-player-id');
    if (!id || !/^[\w-]{8,64}$/.test(id)) {
      id = fresh();
      localStorage.setItem('snail-player-id', id);
    }
    return id;
  } catch {
    return fresh();
  }
}
let memoId: string | null = null;
const myId = () => (memoId ??= playerId());

const sameMove = (a: MoveInput, b: MoveInput) => a.from === b.from && a.to === b.to && (a.promotion ?? '') === (b.promotion ?? '');

/** Rebuild from the server's state, reusing `prev` when it's a prefix (so only new moves animate). */
function sync(prev: ImmortalChessState, moves: MoveInput[], resigned: Color | null): ImmortalChessState {
  const h = prev.history;
  const prefix =
    (prev.gameStatus !== 'resigned' || !!resigned) && h.length <= moves.length && h.every((m, i) => sameMove(m, moves[i]));
  let s = prefix ? prev : createGame();
  for (let i = s.history.length; i < moves.length; i++) s = applyMove(s, moves[i]);
  return resigned ? resign(s, resigned) : s;
}

export type Connection = 'connecting' | 'open' | 'reconnecting';

export function useOnlineGame(roomId: string) {
  const [state, setState] = useState<ImmortalChessState>(() => createGame());
  const [room, setRoom] = useState<RoomState | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const playback = usePlayback(state);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;
    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}${roomSocketPath(roomId)}`);
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        setConnection('open');
        ws.send(JSON.stringify({ type: 'hello', playerId: myId() } satisfies ClientMessage));
        // Keeps mobile networks from dropping an idle socket; answered without waking the room.
        ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 25_000);
      };
      ws.onmessage = (e) => {
        if (e.data === 'pong') return;
        let msg: ServerMessage;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.type !== 'state') return;
        setRoom(msg);
        setState((prev) => {
          try {
            return sync(prev, msg.moves, msg.resigned);
          } catch {
            return prev;
          }
        });
      };
      ws.onclose = () => {
        clearInterval(ping);
        if (wsRef.current === ws) wsRef.current = null;
        if (closed) return;
        setConnection('reconnecting');
        // Back off, with jitter so a server blip doesn't reconnect everyone at once.
        const delay = Math.min(10_000, 500 * 2 ** retry++) * (0.75 + Math.random() / 2);
        retryTimer = setTimeout(connect, delay);
      };
    };
    connect();
    const onVisible = () => {
      // Phones freeze background tabs; reconnect straight away when the player comes back.
      if (document.visibilityState === 'visible' && !wsRef.current) {
        clearTimeout(retryTimer);
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(ping);
      document.removeEventListener('visibilitychange', onVisible);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [roomId]);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    const text = JSON.stringify(msg);
    if (ws?.readyState !== WebSocket.OPEN || text.length > LIMITS.maxMessageBytes) return false;
    ws.send(text);
    return true;
  }, []);

  const you = room?.you ?? 'spectator';
  const myTurn = you !== 'spectator' && state.gameStatus === 'in_progress' && turn(state) === you;

  // Analytics, as in local games: once per game per player.
  const prevRef = useRef(state);
  const sentRef = useRef({ started: false, ended: false });
  const gameNo = room?.game ?? 0;
  const gameRef = useRef(gameNo);
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (gameRef.current !== gameNo) {
      gameRef.current = gameNo;
      sentRef.current = { started: false, ended: false };
    }
    if (prev === state || you === 'spectator') return;
    // Joining mid-game rebuilds from scratch; that isn't a new game.
    if (prev.history.length === 0 && state.history.length > 1) sentRef.current.started = true;
    const ctx = { mode: 'online' as const, humanColor: you, level: 'medium' as const, theme: ACTIVE_THEME.id };
    for (const [event, props] of gameEvents(prev, state, ctx, sentRef.current)) track(event, props);
  }, [state, you, gameNo]);

  /** Play our move straight away; the server confirms it (or resyncs us if it disagrees). */
  const play = useCallback(
    (move: MoveInput): boolean => {
      if (!myTurn || playback.busy) return false;
      let next: ImmortalChessState;
      try {
        next = applyMove(state, move);
      } catch (e) {
        if (e instanceof IllegalMoveError) return false;
        throw e;
      }
      const clean: MoveInput = { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) };
      if (!send({ type: 'move', ply: state.history.length, move: clean })) return false;
      setState(next);
      return true;
    },
    [myTurn, playback.busy, state, send],
  );

  const rematch = useCallback(() => send({ type: 'rematch', game: gameNo }), [send, gameNo]);

  /** Give up; shown straight away, confirmed by the server. */
  const resignGame = useCallback(() => {
    if (you === 'spectator' || state.gameStatus !== 'in_progress') return;
    if (send({ type: 'resign', game: gameNo })) setState(resign(state, you));
  }, [send, gameNo, you, state]);

  /** The host picks a colour while waiting for their friend. */
  const chooseColor = useCallback((color: Color) => send({ type: 'seat', color }), [send]);

  const seats = room?.seats ?? { w: { taken: false, online: false }, b: { taken: false, online: false } };
  const opponent: Color | null = you === 'spectator' ? null : you === 'w' ? 'b' : 'w';

  return {
    state,
    play,
    playback,
    rematch,
    resign: resignGame,
    chooseColor,
    connection,
    /** Null until the server has answered. */
    room,
    you,
    seats,
    opponent,
    /** Shared with useSnailGame so GameScreen can drive either. */
    reset: rematch,
    undo: () => {},
    canUndo: false,
    thinking: false,
    botError: null as string | null,
    /** True whenever it isn't this player's move (the board is locked). */
    isBotTurn: !myTurn,
  };
}

export type OnlineGame = ReturnType<typeof useOnlineGame>;
