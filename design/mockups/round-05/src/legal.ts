// Replays the scene's move list through the real engine (new a-file start), checks the mock
// position matches, and exposes legal moves for the "piece selected" state.
import { applyMove, createGame, getLegalMoves, type ImmortalChessState, type Square } from '../../../../src/engine';
import { FEN, LOG, SNAILS } from './scene.mjs';

let g: ImmortalChessState = createGame();
for (const m of LOG) {
  for (const san of [m.w, m.b]) {
    const legal = getLegalMoves(g);
    const mv = legal.find((x) => x.san.replace(/[+#]/g, '') === san);
    if (!mv) throw new Error(`Scene move ${m.n}. ${san} is not legal in the engine`);
    g = applyMove(g, { from: mv.from as Square, to: mv.to as Square });
  }
}
const placement = (f: string) => f.split(' ')[0];
if (placement(g.fen) !== placement(FEN)) throw new Error(`Scene FEN mismatch:\n engine ${g.fen}\n scene  ${FEN}`);
if (g.snails.w.square !== SNAILS.w.square || g.snails.b.square !== SNAILS.b.square)
  throw new Error(`Snail mismatch: engine ${g.snails.w.square},${g.snails.b.square}`);

export const GAME = g;
export const legalFrom = (sq: string) => getLegalMoves(GAME).filter((m) => m.from === sq).map((m) => m.to as string);
