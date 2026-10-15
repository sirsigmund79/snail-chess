import { useCallback, useEffect, useRef, useState } from 'react';
import { BotClient } from '../bot/botClient';
import type { Level } from '../bot/hybrid';
import { applyMove, createGame, IllegalMoveError, resign, turn } from '../engine/game';
import type { Color, ImmortalChessState, MoveInput } from '../engine/types';
import { gameEvents, track } from '../analytics';
import { ACTIVE_THEME } from './theme';
import { usePlayback } from './usePlayback';

export type Mode = 'hotseat' | 'bot';

/** Pause between the board settling and the bot's move appearing (ms). */
const BOT_MOVE_PAUSE = 450;

export interface GameSettings {
  mode: Mode;
  /** Colour the human plays in bot mode. */
  humanColor: Color;
  level: Level;
}

export function useSnailGame(settings: GameSettings) {
  const [stack, setStack] = useState<ImmortalChessState[]>(() => [createGame()]);
  const [thinking, setThinking] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);
  const botRef = useRef<BotClient | null>(null);
  const state = stack[stack.length - 1];

  const playback = usePlayback(state);

  // Analytics: report a game when its first move is made and when it ends (once each per game).
  const prevRef = useRef(state);
  const sentRef = useRef({ started: false, ended: false });
  useEffect(() => {
    const prev = prevRef.current;
    if (prev === state) return;
    prevRef.current = state;
    const ctx = { mode: settings.mode, humanColor: settings.humanColor, level: settings.level, theme: ACTIVE_THEME.id };
    for (const [event, props] of gameEvents(prev, state, ctx, sentRef.current)) track(event, props);
  }, [state, settings.mode, settings.humanColor, settings.level]);
  const [botPick, setBotPick] = useState<{ for: ImmortalChessState; move: MoveInput } | null>(null);

  const isBotTurn =
    settings.mode === 'bot' && state.gameStatus === 'in_progress' && turn(state) !== settings.humanColor;

  /** Validate and play a human move; returns false (and changes nothing) if illegal. */
  const play = useCallback(
    (move: MoveInput): boolean => {
      if (isBotTurn || playback.busy) return false;
      let next: ImmortalChessState;
      try {
        next = applyMove(state, move);
      } catch (e) {
        if (e instanceof IllegalMoveError) return false;
        throw e;
      }
      setStack((s) => (s[s.length - 1] === state ? [...s, next] : s));
      return true;
    },
    [state, isBotTurn, playback.busy],
  );

  useEffect(() => {
    if (!isBotTurn) return;
    let cancelled = false;
    botRef.current ??= new BotClient();
    setThinking(true);
    const started = performance.now();
    botRef.current
      .choose(state, settings.level)
      .then(async (choice) => {
        // Never reply instantly, even when the search is quick.
        const wait = Math.max(0, 300 - (performance.now() - started));
        await new Promise((r) => setTimeout(r, wait));
        if (!cancelled) setBotPick({ for: state, move: choice.move });
      })
      .catch((e) => !cancelled && setBotError(String(e)))
      .finally(() => !cancelled && setThinking(false));
    return () => {
      cancelled = true;
    };
  }, [isBotTurn, state, settings.level]);

  // The bot thinks during snail playback but only moves once the board has settled, so its
  // reply is a separate event from the snails.
  useEffect(() => {
    if (!botPick || botPick.for !== state || playback.busy) return;
    const t = setTimeout(
      () => setStack((s) => (s[s.length - 1] === state ? [...s, applyMove(state, botPick.move)] : s)),
      BOT_MOVE_PAUSE,
    );
    return () => clearTimeout(t);
  }, [botPick, state, playback.busy]);

  useEffect(() => () => botRef.current?.dispose(), []);

  const reset = useCallback(() => {
    sentRef.current = { started: false, ended: false };
    setStack([createGame()]);
    setBotError(null);
  }, []);

  /** Against the bot you resign; on one phone, the side to move does. */
  const resignGame = useCallback(() => {
    setStack((s) => {
      const top = s[s.length - 1];
      if (top.gameStatus !== 'in_progress') return s;
      return [...s, resign(top, settings.mode === 'bot' ? settings.humanColor : turn(top))];
    });
  }, [settings.mode, settings.humanColor]);

  const undo = useCallback(() => {
    setStack((s) => {
      if (s.length <= 1) return s;
      // Step back one ply; in bot mode keep going until it's the human's turn again.
      let k = s.length - 2;
      if (settings.mode === 'bot') {
        while (k > 0 && turn(s[k]) !== settings.humanColor) k--;
      }
      return s.slice(0, k + 1);
    });
  }, [settings.mode, settings.humanColor]);

  return { state, play, reset, playback, undo, resign: resignGame, thinking, botError, isBotTurn, canUndo: stack.length > 1 };
}
