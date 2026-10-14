/**
 * Browser smoke test against `npm run preview` (default http://localhost:4173):
 *   1. hot-seat: play 6 plies by clicking, assert both snails stepped;
 *   2. vs bot: make a move as White and wait for the bot (Stockfish worker + search worker) to reply.
 *
 *   npx tsx scripts/smoke.ts [url]
 */
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  // A Stockfish failure only logs a warning (the bot falls back to snail search), so count it too.
  if (m.type() === 'error' || m.text().includes('[bot]')) errors.push(m.text());
});
let stockfishLoaded = false;
page.on('requestfinished', (r) => {
  if (r.url().endsWith('stockfish-18-lite-single.wasm')) stockfishLoaded = true;
});

const click = (sq: string) => page.click(`[data-square="${sq}"]`);
const move = async (from: string, to: string) => {
  await click(from);
  await click(to);
};

await page.goto(url);
await page.selectOption('select >> nth=0', 'hotseat');
for (const [f, t] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6']]) {
  await move(f, t);
}
const w = await page.textContent('[data-testid="snail-w"]');
const b = await page.textContent('[data-testid="snail-b"]');
console.log(`after 6 plies: white snail ${w}, black snail ${b}`);
if (w !== 'b5' || b !== 'g4') throw new Error('snails did not tick');
await page.screenshot({ path: process.env.SMOKE_SHOT ?? 'smoke-hotseat.png' });

await page.selectOption('select >> nth=0', 'bot');
await page.click('text=New game');
await move('e2', 'e4');
const t0 = Date.now();
await page.waitForFunction(() => document.querySelectorAll('[data-testid="move-list"] li').length >= 2, null, {
  timeout: 60_000,
});
console.log(`bot replied in ${Date.now() - t0}ms: ${await page.textContent('[data-testid="move-list"]')}`);
await page.screenshot({ path: process.env.SMOKE_SHOT_BOT ?? 'smoke-bot.png' });
await browser.close();
if (!stockfishLoaded) errors.push('Stockfish WASM was never fetched');
if (errors.length) {
  console.error('page errors:', errors);
  process.exit(1);
}
console.log('smoke OK');
