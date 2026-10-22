import { useEffect, useState, type ReactNode } from 'react';
import type { Level } from '../bot/hybrid';
import { DEFAULT_RULES, sameRules, type Color, type GameRules, type ImmortalChessState } from '../engine/types';
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

/** A labelled row of radio buttons, as in the new game menu. */
export function Seg<T extends string | number>({ name, value, options, onPick }: { name: string; value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="field">
      <span className="field-label">{name}</span>
      <div className="seg" role="radiogroup" aria-label={name}>
        {options.map(([v, label]) => (
          <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onPick(v)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The variant rules, folded away behind "More game settings" (open from the start if any differ from the defaults). */
export function MoreRules({ rules, onChange }: { rules: GameRules; onChange: (rules: GameRules) => void }) {
  const [more, setMore] = useState(() => !sameRules(rules, DEFAULT_RULES));
  const set = (change: Partial<GameRules>) => onChange({ ...rules, ...change });
  return (
    <>
      <button className="more-toggle" aria-expanded={more} aria-controls="more-settings" onClick={() => setMore(!more)}>
        More game settings
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {more && (
        <div id="more-settings" className="more-settings">
          <Seg name="Snails move every" value={rules.movesPerTick} options={[[2, '2 moves'], [3, '3 moves'], [4, '4 moves']]} onPick={(movesPerTick) => set({ movesPerTick })} />
          <Seg name="Snail movement" value={rules.movement} options={[['diagonal', 'Standard'], ['straight', 'No diagonals']]} onPick={(movement) => set({ movement })} />
          <Seg name="Snail strength" value={rules.strength} options={[['unstoppable', 'Unstoppable'], ['weak', 'Weak']]} onPick={(strength) => set({ strength })} />
          <p className="muted small">{rules.strength === 'weak' ? 'Weak snails only crush kings and go around everything else.' : 'Unstoppable snails crush whatever they land on.'}</p>
        </div>
      )}
    </>
  );
}

const COUNT = { 2: 'two', 3: 'three', 4: 'four' } as const;

/** How to play, worded for the rules in force (any game can change three of them). */
export function rulesText(rules: GameRules = DEFAULT_RULES): [string, string][] {
  const straight = rules.movement === 'straight';
  return [
    ['Snails hunt the kings.', `Each snail takes the most direct path to the opposite king${straight ? ', moving like a rook: no diagonal steps' : ''}.`],
    [`Every ${COUNT[rules.movesPerTick]} moves, they step.`, 'Each snail moves one square closer.'],
    rules.strength === 'weak'
      ? ['Snails only crush kings.', 'Other pieces are in their way: a snail goes around them by the next shortest path. If a snail reaches a king, game over. If both kings fall at once, it’s a draw.']
      : ['Snails are unstoppable.', 'They capture anything on the square they land on. If a snail captures a king, game over. If both kings fall at once, it’s a draw.'],
    ['Snails are walls.', 'Nothing can land on or pass through a snail. Knights can still jump over.'],
    ['Everything else is chess.', 'Checkmate still wins.'],
  ];
}

/** One line for the room header, e.g. "Snails every 3 moves · diagonal · unstoppable". */
export function rulesSummary(rules: GameRules): string {
  return `Snails every ${rules.movesPerTick} moves · ${rules.movement === 'straight' ? 'no diagonals' : 'diagonal'} · ${rules.strength === 'weak' ? 'weak' : 'unstoppable'}`;
}

export function RulesSheet({ rules, onClose }: { rules?: GameRules; onClose: () => void }) {
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
        {rulesText(rules).map(([h, p]) => (
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
  rules: GameRules;
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
  return (
    <Sheet label="Game settings" onClose={onClose}>
      <h2 className="sheet-title">New game</h2>
      <Seg name="Opponent" value={settings.mode} options={[['bot', 'Snailfish bot'], ['hotseat', 'Friend (same phone)']]} onPick={(mode) => onChange({ ...settings, mode })} />
      {settings.mode === 'bot' && (
        <>
          <Seg name="You play" value={settings.humanColor} options={[['w', 'White'], ['b', 'Black']]} onPick={(humanColor) => onChange({ ...settings, humanColor })} />
          <Seg name="Difficulty" value={settings.level} options={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} onPick={(level) => onChange({ ...settings, level })} />
        </>
      )}
      <MoreRules rules={settings.rules} onChange={(rules) => onChange({ ...settings, rules })} />
      <button className="btn primary wide" onClick={onStart}>
        Start new game
      </button>
      <button className="btn link wide" onClick={onRoom}>
        <span>
          Play a friend online
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9s1.2-6.4 3.7-9z" />
          </svg>
        </span>
      </button>
    </Sheet>
  );
}

const NAME: Record<Color, string> = { w: 'White', b: 'Black' };

function FlagIcon() {
  return (
    <svg className="emblem-flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.5 4.5L17 13H5" />
    </svg>
  );
}

/** Confirm before resigning, so a stray tap can't end the game. */
export function ResignSheet({ who, winner, onResign, onClose }: { who: string; winner: string; onResign: () => void; onClose: () => void }) {
  return (
    <Sheet label="Resign" onClose={onClose}>
      <h2 className="sheet-title">{who === 'You' ? 'Resign this game?' : `${who} resigns?`}</h2>
      <p className="muted">{winner} wins.</p>
      <button className="btn primary wide" onClick={onResign}>
        Resign
      </button>
      <button className="btn wide" onClick={onClose}>
        Keep playing
      </button>
    </Sheet>
  );
}

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
  kind: 'snail' | 'mate' | 'draw' | 'resign';
  title: string;
  line: string;
  meta: string;
}

/**
 * Centred end-of-game card. One action, New game, which opens the options menu. Tap outside the
 * card (or press Escape) to dismiss it and look at the final position.
 */
export function ResultCard({
  info,
  action = 'New game',
  onNew,
  onMenu,
  onDismiss,
}: {
  info: ResultInfo;
  /** Button label: "New game", or "Rematch" in an online room. */
  action?: string;
  onNew: () => void;
  /** Online only: a second button that opens the normal new game options. */
  onMenu?: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);
  return (
    <>
      <div className="dim" onClick={onDismiss} data-testid="result-dim" />
      <section className="result" role="dialog" aria-label={info.title} data-testid="result">
        <div className={`emblem ${info.kind}`}>
          {info.kind === 'snail' ? (
            <SnailIcon side="b" />
          ) : info.kind === 'resign' ? (
            <FlagIcon />
          ) : (
            <span className="emblem-text">{info.kind === 'mate' ? '#' : '½'}</span>
          )}
        </div>
        <h3>{info.title}</h3>
        <p>{info.line}</p>
        <p className="meta">{info.meta}</p>
        <button className="btn primary wide" onClick={onNew}>
          {action}
        </button>
        {onMenu && (
          <button className="btn wide" onClick={onMenu}>
            New game
          </button>
        )}
        <p className="credits">
          <a href="https://stbinf.com/" target="_blank" rel="noopener noreferrer">
            Made by Parker Nolan
          </a>
          <span aria-hidden> · </span>
          <a href="https://www.instagram.com/viper_chess/" target="_blank" rel="noopener noreferrer">
            Inspo from @viper_chess
          </a>
        </p>
      </section>
    </>
  );
}
