import { useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom';
import { track } from '../analytics';
import { isRoomCode } from '../network/roomCode';
import { GameScreen } from './GameScreen';
import { SnailIcon } from './SnailIcon';
import { useOnlineGame } from './useOnlineGame';

const NAME = { w: 'White', b: 'Black' } as const;

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
    return (
      <RoomMessage title={`Room ${roomId}`}>
        <p className="muted">
          Send this link to a friend. You’ll play {NAME[you]}.
          <br />
          The game starts when they open it.
        </p>
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
