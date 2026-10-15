/**
 * Browser smoke test against `npm run preview` (default http://localhost:4173):
 *   1. hot-seat: play 6 plies; the snails must step *after* the move, one at a time, with a banner;
 *   2. vs bot: play 1.e4 in several fresh games; the bot (Stockfish + search workers) must reply,
 *      and not always with the same move.
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

const shot = (name: string) => page.screenshot({ path: `${process.env.SMOKE_DIR ?? '.'}/smoke-${name}.png` });
const snailAt = (c: 'w' | 'b') => page.getAttribute(`[data-testid="snail-piece-${c}"]`, 'data-square');

await page.goto(url);
await page.selectOption('select >> nth=0', 'hotseat');
for (const [f, t] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4']]) {
  await move(f, t);
}
console.log('countdown before 6th ply:', await page.textContent('[data-testid="tick-countdown"]'));
await shot('imminent');
await move('g8', 'f6');

// Staged playback: the snails must not have moved yet when Black's move lands.
const immediately = await snailAt('w');
if (immediately !== 'a4') throw new Error(`white snail moved in the same frame as the move (${immediately})`);
await page.waitForSelector('[data-testid="snail-banner"]', { timeout: 3000 });
console.log('banner:', await page.textContent('[data-testid="snail-banner"]'));
await page.waitForFunction(() => document.querySelector('[data-testid="snail-piece-w"]')?.getAttribute('data-square') === 'b5', null, { timeout: 5000 });
await page.waitForTimeout(250);
await shot('white-step');
if ((await snailAt('b')) !== 'h5') throw new Error('black snail should step after white');
await page.waitForFunction(() => document.querySelector('[data-testid="snail-piece-b"]')?.getAttribute('data-square') === 'g4', null, { timeout: 5000 });
await page.waitForSelector('[data-testid="snail-banner"]', { state: 'detached', timeout: 5000 });
console.log(`after playback: white snail ${await snailAt('w')}, black snail ${await snailAt('b')}`);
console.log('countdown after tick:', await page.textContent('[data-testid="tick-countdown"]'));

// A crush: Black parks a pawn on b5, right where White's snail lands at the first tick.
await page.click('text=New game');
for (const [f, t] of [['e2', 'e4'], ['b7', 'b5'], ['g1', 'f3'], ['a7', 'a6'], ['f1', 'e2'], ['c8', 'b7']]) {
  await move(f, t);
}
await page.waitForFunction(() => document.querySelector('[data-testid="snail-banner"]')?.textContent?.includes('crushed'), null, { timeout: 5000 });
await page.waitForTimeout(150);
console.log('crush banner:', await page.textContent('[data-testid="snail-banner"]'));
await shot('crush');
await page.keyboard.press('Space'); // skip the rest
await page.waitForSelector('[data-testid="snail-banner"]', { state: 'detached', timeout: 2000 });

// SLIMED: shuffle knights for 24 plies so White's snail walks a4→b5→c6→d7→e8 into Black's king.
await page.click('text=New game');
const shuffle = [['b1', 'c3'], ['g8', 'h6'], ['c3', 'b1'], ['h6', 'g8']];
for (let i = 0; i < 24; i++) {
  const [f, t] = shuffle[i % 4];
  await page.waitForFunction(() => !document.querySelector('[data-testid="snail-banner"]'), null, { timeout: 15000 });
  if (i % 6 === 0 && i > 0) await page.keyboard.press('Space');
  await move(f, t);
  if ((i + 1) % 6 === 0 && i < 23) await page.keyboard.press('Space'); // skip the routine ticks
}
await page.waitForSelector('[data-testid="slimed"]', { timeout: 10000 });
await page.waitForTimeout(2200);
await shot('slimed');
console.log('SLIMED finale shown; status:', await page.textContent('[role="status"]'));
await page.keyboard.press('Space');
await page.waitForSelector('[data-testid="slimed"]', { state: 'detached', timeout: 3000 });
console.log('after finale:', await page.textContent('[role="status"]'));

// vs bot: the reply to 1.e4 should vary across fresh games.
await page.selectOption('select >> nth=0', 'bot');
const replies: string[] = [];
for (let i = 0; i < 4; i++) {
  await page.click('text=New game');
  await move('e2', 'e4');
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="move-row"]').length >= 2, null, { timeout: 60_000 });
  const rows = await page.$$eval('[data-testid="move-row"]', (els) => els.map((e) => e.textContent?.trim()));
  replies.push(String(rows[1]));
  console.log(`game ${i + 1}: bot replied ${rows[1]} after ${Date.now() - t0}ms`);
}
if (new Set(replies).size < 2) errors.push(`bot replies did not vary: ${replies.join(', ')}`);
await shot('bot');
await browser.close();
if (!stockfishLoaded) errors.push('Stockfish WASM was never fetched');
if (errors.length) {
  console.error('page errors:', errors);
  process.exit(1);
}
console.log('smoke OK');
