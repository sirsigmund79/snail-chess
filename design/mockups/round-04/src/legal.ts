// Legal moves for the mock position, from the real engine (respects snail walls).
import { createGame, getLegalMoves, type Square } from '../../../../src/engine';
import { FEN, SNAILS } from '../../round-01/src/scene.mjs';

export const GAME = createGame({ fen: FEN, snails: { w: SNAILS.w.square as Square, b: SNAILS.b.square as Square }, plyCount: 16 });
export const legalFrom = (sq: string) => getLegalMoves(GAME).filter((m) => m.from === sq).map((m) => m.to as string);
