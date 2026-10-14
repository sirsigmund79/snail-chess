import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { UciSession } from '../src/bot/uci';

/** Stockfish 18 lite (WASM) running in a Node child process, for tests and self-play. */
export function createNodeStockfish(): UciSession {
  const require = createRequire(import.meta.url);
  const pkg = dirname(require.resolve('stockfish/package.json'));
  const child = spawn(process.execPath, [join(pkg, 'bin', 'stockfish-18-lite-single.js')], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  let buffer = '';
  return new UciSession(
    (cmd) => child.stdin.write(cmd + '\n'),
    (onLine) =>
      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const l of lines) onLine(l);
      }),
    () => child.kill(),
  );
}
