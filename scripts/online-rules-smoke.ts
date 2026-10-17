/**
 * Online variant rules against `npm run build && npx wrangler dev`: the host picks 2 moves, no
 * diagonals and weak snails while waiting; the guest sees them and the snails step after 4 plies.
 *
 *   npx tsx scripts/online-rules-smoke.ts [url]
 */
import { chromium, type Page } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:8787/';
const dir = process.env.SMOKE_DIR ?? '.';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const errors: string[] = [];
const open = async () => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  return page;
};
const move = async (p: Page, from: string, to: string) => {
  await p.waitForFunction(() => !document.querySelector('[data-testid="snail-banner"], .dot-snail.moving'), null, { timeout: 15000 });
  await p.waitForSelector('[data-testid^="player-"] em:has-text("your move")', { timeout: 10000 });
  await p.click(`[data-square="${from}"]`);
  await p.click(`[data-square="${to}"]`);
};
const pick = async (p: Page, field: string, option: string) => {
  await p.click(`.seg[aria-label="${field}"] >> text=${option}`);
  await p.waitForSelector(`.seg[aria-label="${field}"] button.on:has-text("${option}")`);
};

const host = await open();
await host.goto(base);
await host.click('button[aria-label="Menu"]');
await host.click('text=Play a friend online');
await host.waitForSelector('text=Send this link to a friend');
await pick(host, 'Snails move every', '2 moves');
await pick(host, 'Snail movement', 'No diagonals');
await pick(host, 'Snail strength', 'Weak');
await host.screenshot({ path: `${dir}/online-rules-waiting.png` });

const guest = await open();
await guest.goto(host.url());
await guest.waitForSelector('[data-testid="player-w"]');
const tag = await guest.locator('[data-testid="room-tag"]').textContent();
if (!tag?.includes('Snails every 2 moves · no diagonals · weak')) throw new Error(`room tag: ${tag}`);
const dots = await guest.locator('[data-testid="dots-w"] .dot').count();
if (dots !== 2) throw new Error(`expected 2 move dots, got ${dots}`);

// Host is White. After 4 plies the snails step straight: White's a4 wants a5 (Black's snail), so b4.
await move(host, 'e2', 'e4');
await move(guest, 'e7', 'e5');
await move(host, 'g1', 'f3');
await move(guest, 'b8', 'c6');
await guest.waitForFunction(() => document.querySelectorAll('[data-testid="move"]').length === 4);
await guest.waitForTimeout(4000);
await guest.screenshot({ path: `${dir}/online-rules-guest.png` });
const snails = await guest.$$eval('[data-testid^="snail-piece-"]', (els) => els.map((e) => e.getAttribute('data-testid') + '@' + e.getAttribute('data-snail-square')));
console.log('snails', snails);
await guest.click('.toolbar >> text=Rules');
await guest.screenshot({ path: `${dir}/online-rules-sheet.png` });
console.log('errors', errors);
await browser.close();
if (errors.length) process.exit(1);
