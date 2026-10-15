import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom';
import { GameScreen } from './GameScreen';
import { SnailIcon } from './SnailIcon';

function RoomPlaceholder() {
  const { roomId } = useParams();
  return (
    <div className="game room">
      <SnailIcon side="w" className="head-snail" />
      <h2>Room {roomId}</h2>
      <p className="muted">Online rooms are coming soon. For now, play the bot or a friend on the same phone.</p>
      <Link className="btn primary" to="/">
        Back to the game
      </Link>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameScreen />} />
        <Route path="/game/:roomId" element={<RoomPlaceholder />} />
      </Routes>
    </BrowserRouter>
  );
}
