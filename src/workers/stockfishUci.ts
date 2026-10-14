import { UciSession } from '../bot/uci';

/**
 * Stockfish 18 "lite" single-threaded WASM, served from /stockfish/ (copied there by
 * scripts/copy-stockfish.mjs). The build is itself a Web Worker speaking UCI over postMessage;
 * UciSession wraps it with a promise API (MultiPV + searchmoves).
 */
export function createBrowserStockfish(): UciSession | null {
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') return null;
  try {
    const worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-18-lite-single.js`);
    return new UciSession(
      (cmd) => worker.postMessage(cmd),
      (onLine) => worker.addEventListener('message', (e: MessageEvent<string>) => onLine(String(e.data))),
      () => worker.terminate(),
    );
  } catch (err) {
    console.warn('[bot] Stockfish unavailable', err);
    return null;
  }
}
