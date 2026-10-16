import type { MoveInput, Square } from '../engine/types';
import { MATE } from './snailEval';

export interface EngineCandidate {
  move: MoveInput;
  /** Centipawns from the side to move's perspective (mate scores mapped near ±MATE). */
  cp: number;
  depth: number;
}

export interface AnalyzeOptions {
  depth: number;
  multipv: number;
  /** Restrict the root to these UCI moves (our snail-legal list). */
  searchmoves: string[];
  /** Also stop after this many milliseconds, whichever limit comes first (bounds slow phones). */
  movetime?: number;
}

/** Anything that can propose scored candidate moves for a FEN (Stockfish in a worker, in Node…). */
export interface CandidateEngine {
  analyze(fen: string, opts: AnalyzeOptions): Promise<EngineCandidate[]>;
  dispose(): void;
}

export const toUci = (m: MoveInput) => `${m.from}${m.to}${m.promotion ?? ''}`;

export const fromUci = (s: string): MoveInput => ({
  from: s.slice(0, 2) as Square,
  to: s.slice(2, 4) as Square,
  ...(s[4] ? { promotion: s[4] as MoveInput['promotion'] } : {}),
});

/**
 * Commands for one search. `ucinewgame` clears Stockfish's hash table, so it is only sent on a
 * session's first search: later searches (the next move, or a second look at the same position)
 * reuse what earlier ones learned.
 */
export function uciCommands(fen: string, opts: AnalyzeOptions, fresh = false): string[] {
  const limits = `depth ${opts.depth}${opts.movetime ? ` movetime ${opts.movetime}` : ''}`;
  return [
    ...(fresh ? ['ucinewgame'] : []),
    `setoption name MultiPV value ${opts.multipv}`,
    `position fen ${fen}`,
    `go ${limits} searchmoves ${opts.searchmoves.join(' ')}`,
  ];
}

/** Accumulates `info … multipv …` lines until `bestmove`, keeping the deepest line per PV slot. */
export class MultiPvCollector {
  private lines = new Map<number, EngineCandidate>();

  /** Feed one engine output line; returns the final candidates once `bestmove` arrives. */
  push(line: string): EngineCandidate[] | null {
    if (line.startsWith('bestmove')) {
      const out = [...this.lines.values()].sort((a, b) => b.cp - a.cp);
      const best = line.split(/\s+/)[1];
      if (!out.length && best && best !== '(none)') out.push({ move: fromUci(best), cp: 0, depth: 0 });
      this.lines.clear();
      return out;
    }
    if (!line.startsWith('info') || !line.includes(' pv ')) return null;
    const tokens = line.split(/\s+/);
    const get = (key: string) => tokens[tokens.indexOf(key) + 1];
    if (tokens.includes('upperbound') || tokens.includes('lowerbound')) return null;
    const depth = Number(get('depth'));
    const slot = tokens.includes('multipv') ? Number(get('multipv')) : 1;
    const scoreIdx = tokens.indexOf('score');
    if (scoreIdx < 0) return null;
    const kind = tokens[scoreIdx + 1];
    const val = Number(tokens[scoreIdx + 2]);
    const cp = kind === 'mate' ? Math.sign(val || -1) * (MATE - Math.abs(val) * 2) : val;
    const move = fromUci(tokens[tokens.indexOf('pv') + 1]);
    const prev = this.lines.get(slot);
    if (!prev || depth >= prev.depth) this.lines.set(slot, { move, cp, depth });
    return null;
  }
}

/**
 * Serialises analyze() calls over a line-based UCI transport (Web Worker or child process).
 */
export class UciSession implements CandidateEngine {
  private queue: Promise<unknown> = Promise.resolve();
  private listener: ((line: string) => void) | null = null;
  private ready: Promise<void>;
  private searched = false;

  constructor(
    private send: (cmd: string) => void,
    subscribe: (onLine: (line: string) => void) => void,
    private close: () => void,
  ) {
    subscribe((raw) => {
      for (const line of raw.split('\n')) if (line.trim()) this.listener?.(line.trim());
    });
    this.ready = this.waitFor('uciok', 'uci').then(() => this.waitFor('readyok', 'isready'));
  }

  private waitFor(token: string, cmd: string): Promise<void> {
    return new Promise((resolve) => {
      this.listener = (line) => {
        if (line.startsWith(token)) {
          this.listener = null;
          resolve();
        }
      };
      this.send(cmd);
    });
  }

  analyze(fen: string, opts: AnalyzeOptions): Promise<EngineCandidate[]> {
    const run = async () => {
      await this.ready;
      await this.waitFor('readyok', 'isready');
      return new Promise<EngineCandidate[]>((resolve) => {
        const collector = new MultiPvCollector();
        this.listener = (line) => {
          const done = collector.push(line);
          if (done) {
            this.listener = null;
            resolve(done);
          }
        };
        for (const cmd of uciCommands(fen, opts, !this.searched)) this.send(cmd);
        this.searched = true;
      });
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  dispose() {
    this.send('quit');
    this.close();
  }
}
