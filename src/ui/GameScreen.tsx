import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { turn } from '../engine/game';
import type { Color, ImmortalChessState } from '../engine/types';
import { generateRoomCode } from '../network/roomCode';
import { MovesSheet, ResultCard, RulesSheet, SettingsSheet, type ResultInfo, type Settings } from './Sheets';
import { SlimedOverlay } from './SlimedOverlay';
import { SnailBoard } from './SnailBoard';
import { SnailIcon } from './SnailIcon';
import { useSnailGame } from './useSnailGame';

const NAME: Record<Color, string> = { w: 'White', b: 'Black' };
const LEVEL_NAME = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

const Icon = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  rules: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14" />
      <circle cx="12" cy="17.2" r=".7" fill="currentColor" />
    </>
  ),
  moves: <path d="M5 7h14M5 12h14M5 17h9" />,
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

/** Each player's three moves in the snail cycle, then their snail (coral only while the snails move). */
function MoveDots({ color, done, active, moving }: { color: Color; done: number; active: boolean; moving: boolean }) {
  const label = moving ? 'The snails are moving' : `${NAME[color]}: ${done} of 3 moves before the snails move`;
  return (
    <div className="dots" role="img" aria-label={label} data-testid={`dots-${color}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`dot${i < done ? ' on' : ''}${active && i === done ? ' active' : ''}`} />
      ))}
      <SnailIcon side={color} className={`dot-snail${moving ? ' moving' : ''}`} />
    </div>
  );
}

/** Horizontal move strip: newest on the right, a snail after any move that set the snails off. */
function MoveStrip({ state, hideLastTick }: { state: ImmortalChessState; hideLastTick: boolean }) {
  const items: React.ReactNode[] = [];
  state.history.forEach((m, i) => {
    const n = Math.floor(i / 2) + 1;
    items.push(
      <span key={`m${i}`} className="mv" data-testid="move">
        {m.color === 'w' && <b>{n}.</b>}
        {m.san}
      </span>,
    );
    if (m.tick && !(hideLastTick && i === state.history.length - 1)) {
      items.push(
        <span key={`t${i}`} className="mv sn" title="The snails moved">
          <SnailIcon side="w" className={`tiny${m.tick.moves.some((s) => s.crushed) ? ' crushed' : ''}`} />
        </span>,
      );
    }
  });
  if (state.gameStatus === 'in_progress') {
    const n = Math.floor(state.history.length / 2) + 1;
    items.push(
      <span key="now" className="mv now">
        <b>{turn(state) === 'w' ? `${n}.` : `${n}…`}</b>
      </span>,
    );
  }
  return (
    <div className="strip" aria-label="Moves">
      {items}
    </div>
  );
}

function resultInfo(state: ImmortalChessState, mode: Settings['mode'], human: Color, level: Settings['level']): ResultInfo {
  const moves = Math.ceil(state.plyCount / 2);
  const who = (c: Color) => (mode === 'bot' ? (c === human ? 'You' : 'Snailfish') : NAME[c]);
  const winsLine = (c: Color) => (mode === 'bot' && c === human ? `You beat Snailfish (${LEVEL_NAME[level]})` : `${who(c)} wins`);
  if (state.gameStatus === 'snail_win_white' || state.gameStatus === 'snail_win_black') {
    const winner = state.winner!;
    const victim = other(winner);
    const crush = state.history[state.history.length - 1]?.tick?.moves.find((m) => m.crushed?.type === 'k');
    const snail = crush?.color ?? winner;
    const whose = mode === 'bot' && victim === human ? 'your' : `${NAME[victim]}'s`;
    const title = mode === 'bot' ? (victim === human ? 'Slimed.' : 'You slimed them.') : `${NAME[victim]} got slimed.`;
    return {
      kind: 'snail',
      title,
      line: `${NAME[snail]}'s snail got ${whose} king${crush ? ` on ${crush.to}` : ''}.`,
      meta: `${winsLine(winner)} · ${moves} moves`,
    };
  }
  if (state.gameStatus === 'checkmate') {
    const winner = state.winner!;
    const last = state.history[state.history.length - 1]?.san ?? '';
    const exposed = state.endReason && state.endReason !== 'Checkmate';
    return {
      kind: 'mate',
      title: 'Checkmate.',
      line: exposed ? `${state.endReason}.` : `${who(winner) === 'You' ? 'You win' : `${who(winner)} wins`} with ${last}.`,
      meta: `${winsLine(winner)} · ${moves} moves`,
    };
  }
  return { kind: 'draw', title: 'Draw.', line: `${state.endReason ?? 'Draw'}.`, meta: `${moves} moves` };
}

export function GameScreen() {
  const [settings, setSettings] = useState<Settings>({ mode: 'bot', humanColor: 'w', level: 'medium' });
  const [draft, setDraft] = useState<Settings>(settings);
  const [sheet, setSheet] = useState<null | 'menu' | 'rules' | 'moves'>(null);
  // The end card was dismissed (tapped outside) to look at the final position.
  const [reviewing, setReviewing] = useState(false);
  const game = useSnailGame(settings);
  const navigate = useNavigate();
  const { state, playback } = game;
  const over = state.gameStatus !== 'in_progress';
  const last = state.history[state.history.length - 1];
  const snailsMoving = playback.busy && !!last?.tick;

  // Space skips the snail playback.
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

  const openMenu = useCallback(() => {
    setDraft(settings);
    setSheet('menu');
  }, [settings]);

  const startNew = (next: Settings) => {
    setSettings(next);
    game.reset();
    setReviewing(false);
    setSheet(null);
  };

  const orientation = settings.mode === 'bot' && settings.humanColor === 'b' ? 'black' : 'white';
  const bottom: Color = orientation === 'white' ? 'w' : 'b';
  const top = other(bottom);

  // Move dots: plies played in the current 6-ply cycle, split by colour.
  const p = state.plyCount % 6;
  const done: Record<Color, number> = snailsMoving ? { w: 3, b: 3 } : { w: Math.ceil(p / 2), b: Math.floor(p / 2) };
  const toMove = turn(state);

  const player = (c: Color) => {
    const isHuman = settings.mode === 'bot' && c === settings.humanColor;
    const isBot = settings.mode === 'bot' && !isHuman;
    const name = settings.mode === 'bot' ? (isHuman ? 'You' : 'Snailfish') : NAME[c];
    const sub = settings.mode === 'bot' ? (isHuman ? `(${NAME[c]})` : `(${LEVEL_NAME[settings.level]})`) : '';
    const avatar = settings.mode === 'bot' ? (isHuman ? 'You' : 'S') : c.toUpperCase();
    let status = '';
    if (!over && !playback.busy && toMove === c) status = isBot ? (game.thinking ? 'thinking…' : '') : isHuman ? 'your move' : 'to move';
    return (
      <section className={`pbar${isHuman || (settings.mode === 'hotseat' && c === 'w') ? ' light-av' : ''}`} data-testid={`player-${c}`}>
        <div className="av">{avatar}</div>
        <div className="nm">
          <b>{name}</b> {sub && <span>{sub}</span>}
          {status && <em> · {status}</em>}
        </div>
        <MoveDots color={c} done={done[c]} active={!over && !playback.busy && toMove === c} moving={snailsMoving} />
      </section>
    );
  };

  return (
    <div className="game">
      <header className="appbar">
        <button className="ib" aria-label="Menu" onClick={openMenu}>
          <Svg>{Icon.menu}</Svg>
        </button>
        <div className="brand">
          <SnailIcon side="w" className="brand-snail" />
          <span>Immortal Snail Chess</span>
        </div>
        <button className="ib" aria-label="How to play" onClick={() => setSheet('rules')}>
          <Svg>{Icon.rules}</Svg>
        </button>
      </header>
      <MoveStrip state={state} hideLastTick={playback.busy} />
      {game.botError && <p className="error">Bot error: {game.botError}</p>}

      <div className="space" />
      {player(top)}
      <div className="board-wrap">
        <SnailBoard
          frame={playback.frame}
          lastMove={last}
          orientation={orientation}
          interactive={!over && !game.isBotTurn && !playback.busy}
          imminent={!over && !playback.busy && state.plyCount % 6 === 5}
          busy={playback.busy}
          onSkip={playback.skip}
          onMove={game.play}
        />
      </div>
      {player(bottom)}
      <div className="space-b" />

      <nav className="toolbar">
        <button onClick={() => setSheet('moves')}>
          <Svg>{Icon.moves}</Svg>Moves
        </button>
        <button onClick={() => setSheet('rules')}>
          <Svg>{Icon.rules}</Svg>Rules
        </button>
        <button onClick={game.undo} disabled={!game.canUndo || game.thinking || playback.busy}>
          <Svg>{Icon.undo}</Svg>Undo
        </button>
        <button onClick={openMenu}>
          <Svg>{Icon.plus}</Svg>New
        </button>
      </nav>

      {over && !playback.busy && !reviewing && sheet === null && (
        <ResultCard
          info={resultInfo(state, settings.mode, settings.humanColor, settings.level)}
          onNew={openMenu}
          onDismiss={() => setReviewing(true)}
        />
      )}
      {sheet === 'rules' && <RulesSheet onClose={() => setSheet(null)} />}
      {sheet === 'moves' && <MovesSheet state={state} onClose={() => setSheet(null)} />}
      {sheet === 'menu' && (
        <SettingsSheet
          settings={draft}
          onChange={setDraft}
          onStart={() => startNew(draft)}
          onClose={() => setSheet(null)}
          onRoom={() => navigate(`/game/${generateRoomCode()}`)}
        />
      )}
      {playback.frame.slimed && (
        <SlimedOverlay
          victim={playback.frame.slimed.victim}
          by={playback.frame.slimed.by}
          you={settings.mode === 'bot' ? settings.humanColor : null}
          onSkip={playback.skip}
        />
      )}
    </div>
  );
}
