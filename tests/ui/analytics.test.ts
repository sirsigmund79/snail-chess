import { describe, expect, it } from 'vitest';
import { gameEvents, type GameContext } from '../../src/analytics';
import { applyMove, createGame, type ImmortalChessState, type Square } from '../../src/engine';

const ctx: GameContext = { mode: 'bot', humanColor: 'w', level: 'medium', theme: 'walnut' };
const play = (s: ImmortalChessState, uci: string) => applyMove(s, { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square });

describe('analytics game events', () => {
  it('a game starts with its first move, not on page load', () => {
    const g0 = createGame();
    const sent = { started: false, ended: false };
    expect(gameEvents(g0, g0, ctx, sent)).toEqual([]);
    const g1 = play(g0, 'e2e4');
    expect(gameEvents(g0, g1, ctx, sent)).toEqual([
      ['game_started', { opponent: 'bot', difficulty: 'medium', player_color: 'white', theme: 'walnut' }],
    ]);
    // Undo to the start and replay: still one game.
    expect(gameEvents(g1, g0, ctx, sent)).toEqual([]);
    expect(gameEvents(g0, g1, ctx, sent)).toEqual([]);
  });

  it('reports how a game ended', () => {
    let g = createGame();
    const sent = { started: false, ended: false };
    const events: [string, Record<string, unknown>][] = [];
    for (const m of ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7']) {
      const next = play(g, m);
      events.push(...gameEvents(g, next, ctx, sent));
      g = next;
    }
    expect(events.map(([e]) => e)).toEqual(['game_started', 'game_ended']);
    expect(events[1][1]).toMatchObject({ result: 'checkmate', winner: 'white', player_won: true, moves: 4 });
  });

  it('labels snail wins as slimed and hot-seat games as friend games', () => {
    const g = createGame({ fen: '4k2r/8/8/8/8/8/8/R3K3 b - - 0 1', snails: { w: 'd7', b: 'h1' }, plyCount: 5 });
    const done = play(g, 'e8e7');
    const [, ended] = gameEvents(g, done, { ...ctx, mode: 'hotseat' }, { started: true, ended: false })[0];
    expect(ended).toMatchObject({ opponent: 'friend', result: 'slimed', winner: 'white' });
    expect(ended).not.toHaveProperty('difficulty');
  });
});

describe('online analytics', () => {
  it('online games report the player colour and whether they won', () => {
    const g = createGame({ fen: '4k2r/8/8/8/8/8/8/R3K3 b - - 0 1', snails: { w: 'd7', b: 'h1' }, plyCount: 5 });
    const done = play(g, 'e8e7');
    const [, ended] = gameEvents(g, done, { ...ctx, mode: 'online', humanColor: 'b' }, { started: true, ended: false })[0];
    expect(ended).toMatchObject({ opponent: 'online', player_color: 'black', result: 'slimed', winner: 'white', player_won: false });
    expect(ended).not.toHaveProperty('difficulty');
  });
});

describe('resign analytics', () => {
  it('reports a resignation as the result', async () => {
    const { resign } = await import('../../src/engine/game');
    const g = play(createGame(), 'e2e4');
    const [[event, props]] = gameEvents(g, resign(g, 'w'), ctx, { started: true, ended: false });
    expect(event).toBe('game_ended');
    expect(props).toMatchObject({ result: 'resigned', winner: 'black', player_won: false });
  });
});
