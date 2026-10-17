import { useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom';
import { track } from '../analytics';
import type { GameRules } from '../engine/types';
import { isRoomCode } from '../network/roomCode';
import { GameScreen } from './GameScreen';
import { SnailIcon } from './SnailIcon';
import { useOnlineGame } from './useOnlineGame';

const NAME = { w: 'White', b: 'Black' } as const;

/** A labelled row of radio buttons, as in the new game menu. */
function Seg<T extends string | number>({ name, value, options, onPick }: { name: string; value: T; options: [T, string][]; onPick: (v: T) => void }) {
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

function RoomMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="game room">
      <SnailIcon side="w" className="head-snail" />
      <h2>{title}</h2>
      {children}
    </div>
  );
}

/** Copy (or, on phones, share) the room link. */
function InviteButton() {
  const [copied, setCopied] = useState(false);
  const invite = async () => {
    const url = location.href;
    track('online_invite_shared');
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Immortal Snail Chess', text: 'Play me at Immortal Snail Chess 🐌', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Share sheet dismissed, or clipboard blocked: the link is in the address bar anyway.
    }
  };
  return (
    <button className="btn primary wide" onClick={invite}>
      {copied ? 'Link copied' : 'Send invite link'}
    </button>
  );
}

function OnlineRoom({ roomId }: { roomId: string }) {
  const online = useOnlineGame(roomId);
  const [more, setMore] = useState(false);
  const { room, you } = online;

  if (!room) {
    return (
      <RoomMessage title={`Room ${roomId}`}>
        <p className="muted">{online.connection === 'connecting' ? 'Connecting…' : 'Can’t reach the room. Retrying…'}</p>
        <Link className="btn ghost" to="/">
          Back to the game
        </Link>
      </RoomMessage>
    );
  }
  // Until a friend has taken the other seat, show the invite.
  const waiting = you !== 'spectator' && !room.seats[you === 'w' ? 'b' : 'w'].taken && room.moves.length === 0;
  if (waiting) {
    const rules = room.rules;
    const setRules = (change: Partial<GameRules>) => online.chooseRules({ ...rules, ...change });
    return (
      <RoomMessage title={`Room ${roomId}`}>
        <p className="muted">
          Send this link to a friend.
          <br />
          The game starts when they open it.
        </p>
        <Seg name="You play" value={you} options={[['w', NAME.w], ['b', NAME.b]]} onPick={online.chooseColor} />
        <button className="more-toggle" aria-expanded={more} aria-controls="more-settings" onClick={() => setMore(!more)}>
          More game settings
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {more && (
          <div id="more-settings" className="more-settings">
            <Seg name="Snails move every" value={rules.movesPerTick} options={[[2, '2 moves'], [3, '3 moves'], [4, '4 moves']]} onPick={(movesPerTick) => setRules({ movesPerTick })} />
            <Seg name="Snail movement" value={rules.movement} options={[['diagonal', 'Standard'], ['straight', 'No diagonals']]} onPick={(movement) => setRules({ movement })} />
            <Seg name="Snail strength" value={rules.strength} options={[['unstoppable', 'Unstoppable'], ['weak', 'Weak']]} onPick={(strength) => setRules({ strength })} />
            <p className="muted small">{rules.strength === 'weak' ? 'Weak snails only crush kings and go around everything else.' : 'Unstoppable snails crush whatever they land on.'}</p>
          </div>
        )}
        <InviteButton />
        <Link className="btn ghost" to="/">
          Back to the game
        </Link>
      </RoomMessage>
    );
  }
  return <GameScreen online={online} />;
}

function Room() {
  const code = (useParams().roomId ?? '').toUpperCase();
  if (!isRoomCode(code)) {
    return (
      <RoomMessage title="Room not found">
        <p className="muted">That link doesn’t look right. Ask your friend to send it again.</p>
        <Link className="btn primary" to="/">
          Back to the game
        </Link>
      </RoomMessage>
    );
  }
  // Keyed so switching rooms starts a fresh connection.
  return <OnlineRoom key={code} roomId={code} />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameScreen />} />
        <Route path="/game/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}
