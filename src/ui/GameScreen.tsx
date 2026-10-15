import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEVELS, type Level } from '../bot/hybrid';
import { chebyshev, movesUntilSnails, pliesUntilTick } from '../engine/snailEngine';
import { findKing, parseFen } from '../engine/fen';
import { turn } from '../engine/game';
import type { Color, ImmortalChessState } from '../engine/types';
import { generateRoomCode } from '../network/roomCode';
import { SlimedOverlay } from './SlimedOverlay';
import { SnailBoard } from './SnailBoard';
import type { Frame } from './usePlayback';
import { useSnailGame, type Mode } from './useSnailGame';

const NAME: Record<Color, string> = { w: 'White', b: 'Black' };
const PIECE_NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as const;

function SnailCountdown(props: {
  state: ImmortalChessState;
  /** What the board currently shows (lags `state` during snail playback). */
  shown: Pick<Frame, 'fen' | 'snails'>;
  movesLeft: number;
  snailsNext: boolean;
  moving: boolean;
  you: Color | null;
}) {
  const { state, shown, movesLeft, snailsNext, moving, you } = props;
  const over = state.gameStatus !== 'in_progress';
  const blackToMove = turn(state) === 'b';
  let headline: string;
  if (moving) headline = 'The snails are moving!';
  else if (snailsNext) headline = blackToMove ? 'Snails move after this move!' : "Snails move after Black's next move!";
  else headline = `Snails move in ${movesLeft} moves`;
  const urgent = !over && !moving && movesLeft === 1;

  const { board } = parseFen(shown.fen);
  const threat = (['w', 'b'] as const).map((victim) => {
    const king = findKing(board, victim);
    const hunter: Color = victim === 'w' ? 'b' : 'w';
    return { victim, hunter, dist: king ? chebyshev(king, shown.snails[hunter].square) : null };
  });

  return (
    <div
      data-testid="snail-countdown"
      className={`rounded-lg p-3 text-sm ${
        urgent ? 'countdown-urgent bg-amber-100 ring-2 ring-amber-500 dark:bg-amber-950' : 'bg-white dark:bg-stone-800'
      }`}
    >
      <div data-testid="tick-countdown" className="text-base font-bold">
        🐌 {over ? 'Snails at rest' : headline}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {[3, 2, 1].map((n) => (
          <span
            key={n}
            className={`h-2 flex-1 rounded ${
              !over && n > movesLeft ? (urgent ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-stone-300 dark:bg-stone-600'
            }`}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {threat.map(({ victim, hunter, dist }) => (
          <li key={victim} className={dist !== null && dist <= 1 ? 'font-semibold text-red-700 dark:text-red-400' : 'text-stone-600 dark:text-stone-400'}>
            {NAME[hunter]}'s snail (<b data-testid={`snail-${hunter}`}>{shown.snails[hunter].square}</b>){' '}
            {dist === null
              ? `slimed ${you === victim ? 'your' : `${NAME[victim]}'s`} king`
              : `is ${dist} square${dist === 1 ? '' : 's'} from ${you === victim ? 'your' : `${NAME[victim]}'s`} king`}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-stone-500">
        Coloured squares show where each snail steps next. Snails crush whatever is there, and nothing can enter or pass
        through a snail.
      </p>
    </div>
  );
}

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
  const { playback } = game;
  const over = state.gameStatus !== 'in_progress';
  const movesLeft = movesUntilSnails(state.plyCount);
  const snailsNext = pliesUntilTick(state.plyCount) === 1;

  // Space skips the snail cinematics.
  useEffect(() => {
    if (!playback.busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        playback.skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playback]);
  const orientation = mode === 'bot' ? (humanColor === 'w' ? 'white' : 'black') : 'white';

  const slimed = playback.frame.slimed;
  return (
    <>
    <main
      className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_18rem]"
    >
      <section className="min-w-0">
        <div id="snail-board-wrap" className="mx-auto w-full max-w-[min(100%,36rem)]">
          <SnailBoard
            frame={playback.frame}
            lastMove={state.history[state.history.length - 1]}
            orientation={orientation}
            interactive={!over && !game.isBotTurn && !playback.busy}
            imminent={!over && snailsNext && !playback.busy}
            busy={playback.busy}
            onSkip={playback.skip}
            onMove={game.play}
          />
          {playback.busy && (
            <p className="mt-2 text-center text-xs text-stone-500">Click the board or press Space to skip</p>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div
          role="status"
          className={`rounded-lg p-3 text-sm font-medium ${
            over ? 'bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50' : 'bg-white dark:bg-stone-800'
          }`}
        >
          {playback.busy ? '🐌 The snails are on the move…' : statusLine(state, game.thinking)}
          {game.botError && <p className="mt-1 text-red-700 dark:text-red-400">Bot error: {game.botError}</p>}
        </div>

        <SnailCountdown
          state={state}
          shown={playback.frame}
          movesLeft={movesLeft}
          snailsNext={snailsNext}
          moving={playback.busy}
          you={mode === 'bot' ? humanColor : null}
        />

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

        <ol data-testid="move-list" className="max-h-72 overflow-y-auto rounded-lg bg-white p-3 font-mono text-sm dark:bg-stone-800">
          {state.history.map((m, i) => (
            <li key={i}>
              <div data-testid="move-row" className="grid grid-cols-[2.5rem_1fr] items-baseline">
                <span className="text-stone-500">{m.color === 'w' ? `${Math.floor(i / 2) + 1}.` : `${Math.floor(i / 2) + 1}…`}</span>
                <span>{m.san}</span>
              </div>
              {/* Don't spoil the newest snail steps before the animation shows them. */}
              {!(playback.busy && i === state.history.length - 1) &&
                m.tick?.moves.map((sm) => (
                <div
                  key={sm.color}
                  className={`ml-10 mt-0.5 rounded px-1.5 py-0.5 font-sans text-xs ${
                    sm.crushed ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  }`}
                >
                  🐌 {NAME[sm.color]} snail {sm.from}→{sm.to}
                  {sm.crushed && ` · crushed ${NAME[sm.crushed.color]} ${PIECE_NAME[sm.crushed.type]}`}
                </div>
                ))}
            </li>
          ))}
        </ol>
      </aside>
    </main>
    {slimed && (
      <SlimedOverlay victim={slimed.victim} by={slimed.by} you={mode === 'bot' ? humanColor : null} onSkip={playback.skip} />
    )}
    </>
  );
}
