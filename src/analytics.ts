/**
 * Minimal PostHog analytics: page views plus `game_started` / `game_ended`.
 *
 * Off unless VITE_POSTHOG_KEY is set at build time (e.g. as a Cloudflare Pages environment
 * variable), so local play never sends anything. No autocapture, no session recording, and
 * memory-only persistence (no cookies or localStorage).
 */
import type { PostHog } from 'posthog-js';
import type { Color, GameStatus, ImmortalChessState } from './engine/types';

let client: PostHog | null = null;
const queued: [string, Record<string, unknown>][] = [];

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || typeof window === 'undefined') return;
  // Loaded lazily so visitors without analytics configured don't download it.
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: false,
      autocapture: false,
      disable_session_recording: true,
      persistence: 'memory',
      person_profiles: 'identified_only',
      debug: import.meta.env.VITE_POSTHOG_DEBUG === '1',
    });
    client = posthog;
    if (import.meta.env.VITE_POSTHOG_DEBUG === '1') (window as unknown as { posthog: PostHog }).posthog = posthog;
    for (const [event, props] of queued.splice(0)) posthog.capture(event, props);
  });
}

export function track(event: string, props: Record<string, unknown> = {}) {
  if (client) client.capture(event, props);
  else if (import.meta.env.VITE_POSTHOG_KEY) queued.push([event, props]);
}

export interface GameContext {
  mode: 'bot' | 'hotseat';
  humanColor: Color;
  level: 'easy' | 'medium' | 'hard';
  theme: string;
}

const RESULT: Record<Exclude<GameStatus, 'in_progress'>, string> = {
  snail_win_white: 'slimed',
  snail_win_black: 'slimed',
  checkmate: 'checkmate',
  draw: 'draw',
};

/**
 * Which analytics events a state change should produce. Pure, so it can be unit tested:
 * a game "starts" with its first move (opening the page isn't a game) and "ends" when it
 * leaves `in_progress`. `sent` remembers what was already reported for this game, so undoing
 * and replaying the last move doesn't double count.
 */
export function gameEvents(
  prev: ImmortalChessState,
  next: ImmortalChessState,
  ctx: GameContext,
  sent: { started: boolean; ended: boolean },
): [string, Record<string, unknown>][] {
  const out: [string, Record<string, unknown>][] = [];
  const base = {
    opponent: ctx.mode === 'bot' ? 'bot' : 'friend',
    ...(ctx.mode === 'bot' ? { difficulty: ctx.level, player_color: ctx.humanColor === 'w' ? 'white' : 'black' } : {}),
    theme: ctx.theme,
  };
  if (!sent.started && prev.history.length === 0 && next.history.length > 0) {
    sent.started = true;
    out.push(['game_started', base]);
  }
  if (!sent.ended && prev.gameStatus === 'in_progress' && next.gameStatus !== 'in_progress') {
    sent.ended = true;
    const winner = next.winner;
    out.push([
      'game_ended',
      {
        ...base,
        result: RESULT[next.gameStatus as Exclude<GameStatus, 'in_progress'>],
        ...(next.drawReason ? { draw_reason: next.drawReason } : {}),
        winner: winner ? (winner === 'w' ? 'white' : 'black') : 'none',
        ...(ctx.mode === 'bot' && winner ? { player_won: winner === ctx.humanColor } : {}),
        moves: Math.ceil(next.plyCount / 2),
      },
    ]);
  }
  return out;
}
