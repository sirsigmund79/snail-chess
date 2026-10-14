import { useCallback, useEffect, useRef, useState } from 'react';
import { BotClient } from '../bot/botClient';
import type { Level } from '../bot/hybrid';
import { applyMove, createGame, IllegalMoveError, turn } from '../engine/game';
import type { Color, ImmortalChessState, MoveInput } from '../engine/types';

export type Mode = 'hotseat' | 'bot';

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

  const isBotTurn =
    settings.mode === 'bot' && state.gameStatus === 'in_progress' && turn(state) !== settings.humanColor;

  /** Validate and play a human move; returns false (and changes nothing) if illegal. */
  const play = useCallback(
    (move: MoveInput): boolean => {
      if (isBotTurn) return false;
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
    [state, isBotTurn],
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
        // Give the human a beat to see their own move land.
        const wait = Math.max(0, 350 - (performance.now() - started));
        await new Promise((r) => setTimeout(r, wait));
        if (!cancelled) setStack((s) => (s[s.length - 1] === state ? [...s, applyMove(state, choice.move)] : s));
      })
      .catch((e) => !cancelled && setBotError(String(e)))
      .finally(() => !cancelled && setThinking(false));
    return () => {
      cancelled = true;
    };
  }, [isBotTurn, state, settings.level]);

  useEffect(() => () => botRef.current?.dispose(), []);

  const reset = useCallback(() => {
    setStack([createGame()]);
    setBotError(null);
  }, []);

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

  return { state, play, reset, undo, thinking, botError, isBotTurn, canUndo: stack.length > 1 };
}
