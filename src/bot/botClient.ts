import type { ImmortalChessState, MoveInput } from '../engine/types';
import { createBrowserStockfish } from '../workers/stockfishUci';
import { chooseMove, type Choice, type Level } from './hybrid';
import type { ScoredMove } from './snailEval';
import type { CandidateEngine } from './uci';

type Pending = { resolve: (s: ScoredMove[]) => void; reject: (e: Error) => void };

/** Browser bot: Stockfish worker for candidates + a search worker for the snail lookahead. */
export class BotClient {
  private engine: CandidateEngine | null | undefined;
  private search: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  constructor() {
    this.search = new Worker(new URL('../workers/search.worker.ts', import.meta.url), { type: 'module' });
    this.search.onmessage = (e: MessageEvent<{ id: number; scored?: ScoredMove[]; error?: string }>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(e.data.scored ?? []);
    };
  }

  private lookahead = (state: ImmortalChessState, depth: number, only?: MoveInput[]) =>
    new Promise<ScoredMove[]>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.search.postMessage({ id, state, depth, only });
    });

  choose(state: ImmortalChessState, level: Level): Promise<Choice> {
    if (this.engine === undefined) this.engine = createBrowserStockfish();
    return chooseMove(state, level, { engine: this.engine, lookahead: this.lookahead });
  }

  dispose() {
    this.engine?.dispose();
    this.search.terminate();
    for (const p of this.pending.values()) p.reject(new Error('disposed'));
  }
}
