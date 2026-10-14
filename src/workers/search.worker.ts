/// <reference lib="webworker" />
// Runs the snail-aware TS lookahead off the main thread.
import { scoreMoves } from '../bot/snailEval';
import type { ImmortalChessState, MoveInput } from '../engine/types';

export interface SearchRequest {
  id: number;
  state: ImmortalChessState;
  depth: number;
  only?: MoveInput[];
}

self.onmessage = (e: MessageEvent<SearchRequest>) => {
  const { id, state, depth, only } = e.data;
  try {
    const { scored, nodes } = scoreMoves(state, depth, undefined, only);
    self.postMessage({ id, scored, nodes });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
