// Plays both endings through the real engine and turns the results into layout views.
import { applyMove, createGame, getLegalMoves, type ImmortalChessState, type Square } from '../../../../src/engine';
import { cellsOf } from './scene.mjs';
import { GAME } from './legal';

function play(start: ImmortalChessState, sans: string[]): ImmortalChessState {
  let g = start;
  for (const san of sans) {
    // Match on the SAN the game itself records (the internal move list can over-disambiguate).
    const strip = (x: string) => x.replace(/[+#]/g, '');
    const next = getLegalMoves(g)
      .map((mv) => applyMove(g, { from: mv.from as Square, to: mv.to as Square }))
      .find((n) => strip(n.history[n.history.length - 1].san) === strip(san));
    if (!next) throw new Error(`${san} is not legal at ply ${g.plyCount} (${g.fen})`);
    g = next;
  }
  return g;
}

/** Move pairs for the strip, with a snail marker after any move that triggered the snails. */
function logOf(g: ImmortalChessState) {
  const out: { n: number; w: string; b?: string; snails?: boolean }[] = [];
  g.history.forEach((h, i) => {
    if (h.color === 'w') out.push({ n: Math.floor(i / 2) + 1, w: h.san });
    else out[out.length - 1].b = h.san;
    if (h.tick) out[out.length - 1].snails = true;
  });
  return out;
}

function dotsOf(g: ImmortalChessState) {
  const p = g.plyCount % 6;
  const justTicked = p === 0 && !!g.history[g.history.length - 1]?.tick;
  if (justTicked) return { w: { done: 3, active: -1 }, b: { done: 3, active: -1 }, snailsMoving: true };
  return { w: { done: Math.ceil(p / 2), active: -1 }, b: { done: Math.floor(p / 2), active: -1 }, snailsMoving: false };
}

const kingSquare = (fen: string, color: 'w' | 'b') => {
  const rows = fen.split(' ')[0].split('/');
  for (let i = 0; i < 8; i++) {
    let f = 0;
    for (const ch of rows[i]) {
      if (/\d/.test(ch)) f += Number(ch);
      else { if (ch === (color === 'w' ? 'K' : 'k')) return 'abcdefgh'[f] + (8 - i); f++; }
    }
  }
  return null;
};

// --- Slimed: from the mock position, your king stays on e1 while Black castles away. ----------
const slimedGame = play(GAME, ['Qe2', 'O-O', 'b3', 'Re8', 'Bb2', 'Nc6', 'Bc1', 'Kh8']);
if (slimedGame.gameStatus !== 'snail_win_black') throw new Error(`expected a snail win, got ${slimedGame.gameStatus}`);
const lastTick = slimedGame.history[slimedGame.history.length - 1].tick!;
const crushSq = lastTick.moves.find((m) => m.crushed?.type === 'k')!.to;
const slimedCells = cellsOf({ fen: slimedGame.fen, snails: { w: { square: slimedGame.snails.w.square }, b: { square: slimedGame.snails.b.square } }, marks: { [crushSq]: 'crushed' } });
const slimedBase = { cells: slimedCells, log: logOf(slimedGame), now: null, dots: dotsOf(slimedGame), yourTurn: false };
const moves = Math.ceil(slimedGame.plyCount / 2);

export const SLIMED_MOMENT = { ...slimedBase, slimed: { caption: "Your king was crushed by Black's snail" } };
export const SLIMED_RESULT = {
  ...slimedBase,
  result: { top: '36%', kind: 'snailwin', title: 'Slimed.', line: `Black's snail got your king on ${crushSq}.`, meta: `Snailfish (Medium) wins · ${moves} moves` },
};

// --- Checkmate: a quick Scholar's mate with the snails on the board. -------------------------
const mateGame = play(createGame(), ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7']);
if (mateGame.gameStatus !== 'checkmate' || mateGame.winner !== 'w') throw new Error(`expected checkmate, got ${mateGame.gameStatus}`);
const mated = kingSquare(mateGame.fen, 'b')!;
export const CHECKMATE = {
  cells: cellsOf({ fen: mateGame.fen, snails: { w: { square: mateGame.snails.w.square }, b: { square: mateGame.snails.b.square } }, marks: { [mated]: 'mated' } }),
  log: logOf(mateGame),
  now: null,
  dots: dotsOf(mateGame),
  yourTurn: false,
  result: { top: '66%', kind: 'mate', title: 'Checkmate.', line: `You win with ${mateGame.history[mateGame.history.length - 1].san}.`, meta: `You beat Snailfish (Medium) · ${Math.ceil(mateGame.plyCount / 2)} moves` },
};

export const SUMMARY = {
  slimed: `${slimedGame.gameStatus} at ply ${slimedGame.plyCount}, crushed on ${crushSq}; snails ${slimedGame.snails.w.square}/${slimedGame.snails.b.square}`,
  mate: `${mateGame.gameStatus} at ply ${mateGame.plyCount}, king on ${mated}; snails ${mateGame.snails.w.square}/${mateGame.snails.b.square}`,
};
