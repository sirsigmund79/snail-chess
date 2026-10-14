// Copies the single-threaded "lite" Stockfish WASM build into public/ so it can be served as a
// static Web Worker without cross-origin-isolation headers.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'stockfish', 'bin');
const dest = join(root, 'public', 'stockfish');
if (!existsSync(src)) {
  console.warn('[copy-stockfish] stockfish package not installed; skipping');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm']) {
  copyFileSync(join(src, f), join(dest, f));
}
console.log('[copy-stockfish] copied engine to public/stockfish');
