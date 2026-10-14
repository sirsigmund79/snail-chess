import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEVELS, type Level } from '../bot/hybrid';
import { pliesUntilTick } from '../engine/snailEngine';
import { turn } from '../engine/game';
import type { Color, ImmortalChessState } from '../engine/types';
import { generateRoomCode } from '../network/roomCode';
import { SnailBoard } from './SnailBoard';
import { useSnailGame, type Mode } from './useSnailGame';

const NAME: Record<Color, string> = { w: 'White', b: 'Black' };

function statusLine(state: ImmortalChessState, thinking: boolean): string {
  switch (state.gameStatus) {
    case 'in_progress':
      return thinking ? 'Bot is thinking…' : `${NAME[turn(state)]} to move`;
    case 'draw':
      return `Draw — ${state.endReason}`;
    default:
      return `${state.winner ? NAME[state.winner] : ''} wins — ${state.endReason}`;
  }
}

export function GameScreen() {
  const [mode, setMode] = useState<Mode>('bot');
  const [humanColor, setHumanColor] = useState<Color>('w');
  const [level, setLevel] = useState<Level>('medium');
  const game = useSnailGame({ mode, humanColor, level });
  const navigate = useNavigate();
  const { state } = game;
  const plies = pliesUntilTick(state.plyCount);
  const over = state.gameStatus !== 'in_progress';
  const orientation = mode === 'bot' ? (humanColor === 'w' ? 'white' : 'black') : 'white';

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="min-w-0">
        <div className="mx-auto w-full max-w-[min(100%,36rem)]">
          <SnailBoard
            state={state}
            orientation={orientation}
            interactive={!over && !game.isBotTurn}
            onMove={game.play}
          />
        </div>
      </section>

      <aside className="space-y-4">
        <div
          role="status"
          className={`rounded-lg p-3 text-sm font-medium ${
            over ? 'bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50' : 'bg-white dark:bg-stone-800'
          }`}
        >
          {statusLine(state, game.thinking)}
          {game.botError && <p className="mt-1 text-red-700 dark:text-red-400">Bot error: {game.botError}</p>}
        </div>

        <div className="rounded-lg bg-white p-3 text-sm dark:bg-stone-800">
          <div className="flex items-center justify-between">
            <span>Next snail step in</span>
            <span data-testid="tick-countdown" className="font-mono text-lg font-bold">
              {plies} {plies === 1 ? 'ply' : 'plies'}
            </span>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded ${i < 6 - plies ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
            🐌 White snail on <b data-testid="snail-w">{state.snails.w.square}</b> hunts Black's king. 🐌 Black snail on{' '}
            <b data-testid="snail-b">{state.snails.b.square}</b> hunts White's king. Outlined squares show where each
            snail steps next; snails crush anything there and nothing can enter or pass through them.
          </p>
        </div>

        <div className="space-y-2 rounded-lg bg-white p-3 text-sm dark:bg-stone-800">
          <label className="flex items-center justify-between gap-2">
            Mode
            <select className="rounded border px-2 py-1 dark:bg-stone-700" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="bot">vs Bot</option>
              <option value="hotseat">Hot-seat (2 players)</option>
            </select>
          </label>
          {mode === 'bot' && (
            <>
              <label className="flex items-center justify-between gap-2">
                You play
                <select className="rounded border px-2 py-1 dark:bg-stone-700" value={humanColor} onChange={(e) => setHumanColor(e.target.value as Color)}>
                  <option value="w">White</option>
                  <option value="b">Black</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                Difficulty
                <select className="rounded border px-2 py-1 dark:bg-stone-700" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                  {Object.keys(LEVELS).map((l) => (
                    <option key={l} value={l}>
                      {l[0].toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="flex gap-2 pt-1">
            <button className="flex-1 rounded bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700" onClick={game.reset}>
              New game
            </button>
            <button
              className="flex-1 rounded border border-stone-300 px-3 py-1.5 disabled:opacity-40 dark:border-stone-600"
              onClick={game.undo}
              disabled={!game.canUndo || game.thinking}
            >
              Undo
            </button>
          </div>
          <button
            className="w-full rounded border border-dashed border-stone-400 px-3 py-1.5 text-stone-600 dark:text-stone-300"
            onClick={() => navigate(`/game/${generateRoomCode()}`)}
          >
            Create online room (soon)
          </button>
        </div>

        <ol data-testid="move-list" className="max-h-64 overflow-y-auto rounded-lg bg-white p-3 font-mono text-sm dark:bg-stone-800">
          {state.history.map((m, i) => (
            <li key={i} className="grid grid-cols-[2.5rem_4.5rem_1fr] items-baseline">
              <span className="text-stone-500">{m.color === 'w' ? `${Math.floor(i / 2) + 1}.` : ''}</span>
              <span>{m.san}</span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                {m.tick?.moves.map((s) => `🐌${s.from}→${s.to}${s.crushed ? ' ✕' + s.crushed.type.toUpperCase() : ''}`).join(' ')}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
