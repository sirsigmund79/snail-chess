import { useEffect, type ReactNode } from 'react';
import type { Level } from '../bot/hybrid';
import type { Color, ImmortalChessState } from '../engine/types';
import { SnailIcon } from './SnailIcon';
import type { Mode } from './useSnailGame';

/** Bottom sheet with a scrim; tap outside or press Escape to close. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grip" />
        {children}
      </section>
    </>
  );
}

export const RULES: [string, string][] = [
  ['Snails hunt the kings.', 'Each snail takes the most direct path to the opposite king.'],
  ['Every three moves, they step.', 'Each snail moves one square closer.'],
  ['Snails are unstoppable.', 'They capture anything on the square they land on. If a snail captures a king, game over.'],
  ['Snails are walls.', 'Nothing can land on or pass through a snail. Knights can still jump over.'],
  ['Everything else is chess.', 'Checkmate still wins.'],
];

export function RulesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="How to play" onClose={onClose}>
      <header className="sheet-head">
        <SnailIcon side="w" className="head-snail" />
        <div>
          <h2>Immortal Snail Chess</h2>
          <p>How to play</p>
        </div>
      </header>
      <ol className="rules">
        {RULES.map(([h, p]) => (
          <li key={h}>
            <b>{h}</b> {p}
          </li>
        ))}
      </ol>
      <button className="btn primary wide" onClick={onClose}>
        Got it
      </button>
    </Sheet>
  );
}

export interface Settings {
  mode: Mode;
  humanColor: Color;
  level: Level;
}

/** The menu: game settings and starting a new game. */
export function SettingsSheet({
  settings,
  onChange,
  onStart,
  onClose,
  onRoom,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
  onClose: () => void;
  onRoom: () => void;
}) {
  const seg = <T extends string>(name: string, value: T, options: [T, string][], set: (v: T) => void) => (
    <div className="field">
      <span className="field-label">{name}</span>
      <div className="seg" role="radiogroup" aria-label={name}>
        {options.map(([v, label]) => (
          <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => set(v)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <Sheet label="Game settings" onClose={onClose}>
      <h2 className="sheet-title">New game</h2>
      {seg('Opponent', settings.mode, [['bot', 'Snailfish bot'], ['hotseat', 'Friend (same phone)']], (mode) => onChange({ ...settings, mode }))}
      {settings.mode === 'bot' && (
        <>
          {seg('You play', settings.humanColor, [['w', 'White'], ['b', 'Black']], (humanColor) => onChange({ ...settings, humanColor }))}
          {seg('Difficulty', settings.level, [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']], (level) => onChange({ ...settings, level }))}
        </>
      )}
      <button className="btn primary wide" onClick={onStart}>
        Start new game
      </button>
      <button className="btn ghost wide" onClick={onRoom}>
        Play online (coming soon)
      </button>
    </Sheet>
  );
}

const NAME: Record<Color, string> = { w: 'White', b: 'Black' };

/** Full move list, with snail steps as their own rows. */
export function MovesSheet({ state, onClose }: { state: ImmortalChessState; onClose: () => void }) {
  const PIECE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as const;
  return (
    <Sheet label="Moves" onClose={onClose}>
      <h2 className="sheet-title">Moves</h2>
      {state.history.length === 0 ? (
        <p className="muted">No moves yet.</p>
      ) : (
        <ol className="move-table" data-testid="move-table">
          {state.history.map((m, i) =>
            m.color === 'w' || i === 0 ? (
              <li key={i}>
                <span className="n">{Math.floor(i / 2) + 1}.</span>
                <span>{m.color === 'w' ? m.san : '…'}</span>
                <span>{m.color === 'b' ? m.san : state.history[i + 1]?.san ?? ''}</span>
                {[m, state.history[i + 1]].map((r) =>
                  r?.tick?.moves.map((sm) => (
                    <span key={`${i}-${sm.color}`} className={`tick${sm.crushed ? ' crush' : ''}`}>
                      <SnailIcon side={sm.color} className="tiny" /> {NAME[sm.color]} snail {sm.from}→{sm.to}
                      {sm.crushed ? ` · crushed ${NAME[sm.crushed.color]}'s ${PIECE[sm.crushed.type]}` : ''}
                    </span>
                  )),
                )}
              </li>
            ) : null,
          )}
        </ol>
      )}
      <button className="btn wide" onClick={onClose}>
        Back to the board
      </button>
    </Sheet>
  );
}

export interface ResultInfo {
  kind: 'snail' | 'mate' | 'draw';
  title: string;
  line: string;
  meta: string;
}

/** Centred end-of-game card, as on chess.com: Rematch first, then Review / New game. */
export function ResultCard({
  info,
  onRematch,
  onReview,
  onNew,
}: {
  info: ResultInfo;
  onRematch: () => void;
  onReview: () => void;
  onNew: () => void;
}) {
  return (
    <>
      <div className="dim" />
      <section className="result" role="dialog" aria-label={info.title} data-testid="result">
        <div className={`emblem ${info.kind}`}>
          {info.kind === 'snail' ? <SnailIcon side="b" /> : <span className="emblem-text">{info.kind === 'mate' ? '#' : '½'}</span>}
        </div>
        <h3>{info.title}</h3>
        <p>{info.line}</p>
        <p className="meta">{info.meta}</p>
        <button className="btn primary wide" onClick={onRematch}>
          Rematch
        </button>
        <div className="row">
          <button className="btn" onClick={onReview}>
            Review
          </button>
          <button className="btn" onClick={onNew}>
            New game
          </button>
        </div>
      </section>
    </>
  );
}
