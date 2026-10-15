/**
 * Browser smoke test against `npm run preview` (default http://localhost:4173), at phone size:
 *  1. theme: Paper grey board, console-only ?hyper hint, blue legal squares on selection;
 *  2. hot-seat: snails step after the 6th ply, one at a time, with banners and coral move dots;
 *  3. a snail crush; a snail taking a king (SLIMED, then the result card); a normal checkmate;
 *  4. rules and moves sheets;
 *  5. vs bot: replies arrive (Stockfish + search workers) and vary between games;
 *  6. ?hyper unlocks Bubblegum Bass.
 *
 *   npx tsx scripts/smoke.ts [url]
 */
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors: string[] = [];
const logs: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  logs.push(m.text());
  // A Stockfish failure only logs a warning (the bot falls back to snail search), so count it too.
  if (m.type() === 'error' || m.text().includes('[bot]')) errors.push(m.text());
});
let stockfishLoaded = false;
page.on('requestfinished', (r) => {
  if (r.url().endsWith('stockfish-18-lite-single.wasm')) stockfishLoaded = true;
});

const shot = async (name: string) => {
  await page.waitForTimeout(350); // let sheet / card entrance animations finish
  await page.screenshot({ path: `${process.env.SMOKE_DIR ?? '.'}/smoke-${name}.png` });
};
const click = (sq: string) => page.click(`[data-square="${sq}"]`);
const move = async (from: string, to: string) => {
  await page.waitForFunction(() => !document.querySelector('[data-testid="snail-banner"]'), null, { timeout: 15000 });
  await click(from);
  await click(to);
};
const snailAt = (c: 'w' | 'b') => page.getAttribute(`[data-testid="snail-piece-${c}"]`, 'data-snail-square');
const squareBg = (sq: string, inner = false) =>
  page.evaluate(([s, i]) => getComputedStyle(document.querySelector(`[data-square="${s}"]${i ? ' > div' : ''}`) as Element).backgroundColor, [sq, inner] as const);
const newGame = async (opponent: 'Snailfish bot' | 'Friend (same phone)') => {
  await page.click('button[aria-label="Menu"]');
  await page.click(`.sheet >> text=${opponent}`);
  await page.click('text=Start new game');
};
const skipPlayback = async () => {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !document.querySelector('[data-testid="snail-banner"]'), null, { timeout: 3000 });
};

// 1. Theme
await page.goto(url);
await page.waitForSelector('[data-square="a1"]');
if ((await squareBg('a1')) !== 'rgb(227, 227, 227)') throw new Error(`expected paper-grey board, got ${await squareBg('a1')}`);
if (!logs.some((l) => l.includes('?hyper'))) throw new Error('missing console hint');
if (await page.locator('text=hyper').count()) throw new Error('the hyper hint must not appear on the page');
await click('e2');
if ((await squareBg('e4', true)) !== 'rgb(46, 155, 255)') throw new Error('expected e4 highlighted as legal');
await click('e2');
await shot('start');
console.log('theme ok: paper grey, console-only hint, legal squares in blue');

// 2. Hot-seat snail playback
await newGame('Friend (same phone)');
for (const [f, t] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4']]) await move(f, t);
if (!(await page.locator('[data-testid="dots-b"] .dot.active').count())) throw new Error("Black's active dot missing");
await shot('imminent');
await move('g8', 'f6');
if ((await snailAt('w')) !== 'a4') throw new Error('white snail moved in the same frame as the move');
await page.waitForSelector('[data-testid="snail-banner"]', { timeout: 3000 });
if (!(await page.locator('.dot-snail.moving').count())) throw new Error('move-dot snails should turn coral while the snails move');
await page.waitForFunction(() => document.querySelector('[data-testid="snail-piece-w"]')?.getAttribute('data-snail-square') === 'b5', null, { timeout: 5000 });
if ((await snailAt('b')) !== 'a5') throw new Error('black snail should step after white');
await shot('white-step');
await page.waitForFunction(() => document.querySelector('[data-testid="snail-piece-b"]')?.getAttribute('data-snail-square') === 'b4', null, { timeout: 5000 });
await page.waitForSelector('[data-testid="snail-banner"]', { state: 'detached', timeout: 5000 });
if (await page.locator('.dot-snail.moving').count()) throw new Error('snail icons should be back to ink after the snails move');
console.log(`snails ok: ${await snailAt('w')} / ${await snailAt('b')} after the first step`);

// 3a. A crush: Black parks a pawn on b5, right where White's snail lands.
await newGame('Friend (same phone)');
for (const [f, t] of [['e2', 'e4'], ['b7', 'b5'], ['g1', 'f3'], ['a7', 'a6'], ['f1', 'e2'], ['c8', 'b7']]) await move(f, t);
await page.waitForFunction(() => document.querySelector('[data-testid="snail-banner"]')?.textContent?.includes('crushed'), null, { timeout: 5000 });
await shot('crush');
await skipPlayback();
console.log('crush ok');

// 3b. SLIMED: shuffle knights for 24 plies so White's snail walks a4→b5→c6→d7→e8 into Black's king.
await newGame('Friend (same phone)');
const shuffle = [['g1', 'f3'], ['g8', 'h6'], ['f3', 'g1'], ['h6', 'g8']]; // clear of both snails' paths
for (let i = 0; i < 24; i++) {
  const [f, t] = shuffle[i % 4];
  await move(f, t);
  if ((i + 1) % 6 === 0 && i < 23) await skipPlayback();
}
await page.waitForSelector('[data-testid="slimed"]', { timeout: 10000 });
await page.waitForTimeout(2000);
await shot('slimed');
await page.keyboard.press('Space');
await page.waitForSelector('[data-testid="result"]', { timeout: 5000 });
const slimedTitle = await page.textContent('[data-testid="result"] h3');
if (slimedTitle !== 'Black got slimed.') throw new Error(`unexpected result title: ${slimedTitle}`);
await shot('slimed-result');
console.log('slimed ok:', slimedTitle, '·', await page.textContent('[data-testid="result"] p'));
await page.click('[data-testid="result"] >> text=Rematch');
await page.waitForSelector('[data-testid="result"]', { state: 'detached' });

// 3c. Checkmate: Scholar's mate with the snails on the board.
for (const [f, t] of [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6']]) await move(f, t);
await skipPlayback();
await move('h5', 'f7');
await page.waitForSelector('[data-testid="result"]', { timeout: 5000 });
const mateTitle = await page.textContent('[data-testid="result"] h3');
if (mateTitle !== 'Checkmate.') throw new Error(`unexpected result title: ${mateTitle}`);
if (await page.locator('[data-testid="slimed"]').count()) throw new Error('checkmate must not show SLIMED');
await shot('checkmate');
console.log('checkmate ok:', await page.textContent('[data-testid="result"] p'));
await page.click('[data-testid="result"] >> text=Review');

// 4. Sheets
await page.click('.toolbar >> text=Rules');
if ((await page.textContent('.sheet h2')) !== 'Immortal Snail Chess') throw new Error('rules sheet header missing');
await shot('rules');
await page.click('text=Got it');
await page.click('.toolbar >> text=Moves');
await page.waitForSelector('[data-testid="move-table"]');
await shot('moves');
await page.click('text=Back to the board');
console.log('sheets ok');

// 5. vs bot: the reply to 1.e4 should vary across fresh games.
const replies: string[] = [];
for (let i = 0; i < 4; i++) {
  await newGame('Snailfish bot');
  await move('e2', 'e4');
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="move"]').length >= 2, null, { timeout: 60_000 });
  const reply = (await page.locator('[data-testid="move"]').nth(1).textContent()) ?? '';
  replies.push(reply);
  console.log(`game ${i + 1}: bot replied ${reply} after ${Date.now() - t0}ms`);
}
if (new Set(replies).size < 2) errors.push(`bot replies did not vary: ${replies.join(', ')}`);
await shot('bot');

// 6. Hidden theme
await page.goto(url.replace(/\/?$/, '/') + '?hyper');
await page.waitForSelector('[data-square="a1"]');
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
if (bg !== 'rgb(255, 211, 239)' || (await squareBg('a1')) !== 'rgb(255, 143, 210)') throw new Error(`?hyper did not apply bubblegum (${bg})`);
if (!logs.some((l) => l.includes('Bubblegum Bass unlocked'))) throw new Error('missing unlock log');
await shot('hyper');
console.log('?hyper ok');

await browser.close();
if (!stockfishLoaded) errors.push('Stockfish WASM was never fetched');
if (errors.length) {
  console.error('page errors:', errors);
  process.exit(1);
}
console.log('smoke OK');
