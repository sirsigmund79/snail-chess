import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom';
import { GameScreen } from './GameScreen';

function RoomPlaceholder() {
  const { roomId } = useParams();
  return (
    <div className="mx-auto max-w-lg p-6 text-center">
      <h2 className="text-xl font-semibold">Room {roomId}</h2>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Online rooms are coming soon (PartyKit). For now, play hot-seat or against the bot.
      </p>
      <Link className="mt-4 inline-block text-emerald-700 underline dark:text-emerald-400" to="/">
        Back to local play
      </Link>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <header className="border-b border-stone-300 px-4 py-3 dark:border-stone-700">
        <Link to="/" className="text-lg font-bold">
          🐌 Immortal Snail Chess
        </Link>
      </header>
      <Routes>
        <Route path="/" element={<GameScreen />} />
        <Route path="/game/:roomId" element={<RoomPlaceholder />} />
      </Routes>
    </BrowserRouter>
  );
}
