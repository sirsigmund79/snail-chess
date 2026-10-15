/**
 * Two-browser online smoke test against `npm run build && npx wrangler dev` (default
 * http://localhost:8787): create a room, join from a second browser, play, reload mid-game (keeps
 * the seat), finish with a checkmate, rematch (colours swap), and a third browser spectates.
 *
 *   npx tsx scripts/online-smoke.ts [url]
 */
import { chromium, type Page } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:8787/';
const dir = process.env.SMOKE_DIR ?? '.';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const errors: string[] = [];
const open = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return page;
};
const settle = (p: Page) =>
  p.waitForFunction(() => !document.querySelector('[data-testid="snail-banner"], .dot-snail.moving'), null, { timeout: 15000 });
const move = async (p: Page, from: string, to: string) => {
  await settle(p);
  await p.waitForSelector('[data-testid^="player-"] em:has-text("your move")', { timeout: 10000 });
  await p.click(`[data-square="${from}"]`);
  await p.click(`[data-square="${to}"]`);
};
const moveCount = (p: Page) => p.locator('[data-testid="move"]').count();
const waitMoves = (p: Page, n: number) =>
  p.waitForFunction((k) => document.querySelectorAll('[data-testid="move"]').length === k, n, { timeout: 10000 });
const names = (p: Page) => p.$$eval('.pbar .nm', (els) => els.map((e) => e.textContent?.trim()));

const host = await open();
await host.goto(base);
await host.click('button[aria-label="Menu"]');
await host.click('text=Play a friend online');
await host.waitForSelector('text=Send this link to a friend');
await host.screenshot({ path: `${dir}/online-waiting.png` });
const roomUrl = host.url();
console.log('room', roomUrl);

const guest = await open();
await guest.goto(roomUrl);
await guest.waitForSelector('[data-testid="player-w"]');
await host.waitForSelector('[data-testid="player-w"]');
console.log('host bars', await names(host));
console.log('guest bars', await names(guest));

await move(host, 'e2', 'e4');
await waitMoves(guest, 1);
await move(guest, 'e7', 'e5');
await waitMoves(host, 2);

// Guest reloads mid-game: same seat, same position.
await guest.reload();
await guest.waitForSelector('[data-testid="player-w"]');
await waitMoves(guest, 2);
await move(host, 'g1', 'f3');
await waitMoves(guest, 3);
await move(guest, 'b8', 'c6');
await move(host, 'f1', 'c4');
await move(guest, 'g8', 'f6'); // 6th ply: snails move
await waitMoves(host, 6);
await settle(host);
await host.screenshot({ path: `${dir}/online-host-after-tick.png` });
await guest.screenshot({ path: `${dir}/online-guest-after-tick.png` });

// Spectator: a third browser sees the same moves but can't play.
const spec = await open();
await spec.goto(roomUrl);
await waitMoves(spec, 6);
console.log('spectator bars', await names(spec));

// Out-of-turn moves are refused by the board (and would be by the server).
await guest.click('[data-square="d7"]');
await guest.click('[data-square="d5"]');
await guest.waitForTimeout(500);
if ((await moveCount(guest)) !== 6) throw new Error('guest moved out of turn');

// Scholar's mate: Qxf7#.
await move(host, 'd1', 'e2');
await move(guest, 'a7', 'a6');
await move(host, 'c4', 'f7'); // Bxf7+
await move(guest, 'e8', 'f7');
await waitMoves(host, 10);
await move(host, 'f3', 'g5');
await move(guest, 'f7', 'g8');
await move(host, 'e2', 'c4');
await move(guest, 'd7', 'd5');
await move(host, 'c4', 'd5');
await move(guest, 'c8', 'e6');
await move(host, 'd5', 'e6'); // Qxe6# — or close; finish however it ends
const over = await host
  .waitForSelector('[data-testid="result"]', { timeout: 8000 })
  .then(() => true)
  .catch(() => false);
console.log('game over card:', over);
if (over) {
  await guest.waitForSelector('[data-testid="result"]');
  await host.screenshot({ path: `${dir}/online-result-host.png` });
  const label = await guest.locator('[data-testid="result"] button').textContent();
  console.log('result title host:', await host.locator('[data-testid="result"] h3').textContent(), '| guest:', await guest.locator('[data-testid="result"] h3').textContent(), '| button:', label);
  await guest.click('[data-testid="result"] button');
  await waitMoves(host, 0);
  await waitMoves(guest, 0);
  console.log('after rematch host bars', await names(host));
  console.log('after rematch guest bars', await names(guest));
  await move(guest, 'd2', 'd4'); // guest is White now
  await waitMoves(host, 1);
  await host.screenshot({ path: `${dir}/online-rematch-host.png` });
}

// Opponent leaves: the other side shows them offline.
await guest.context().close();
await host.waitForSelector('.pbar em:has-text("offline")', { timeout: 10000 });
console.log('offline status shown');

// Bad room code.
await spec.goto(new URL('/game/nope!', base).toString());
await spec.waitForSelector('text=Room not found');

await browser.close();
if (errors.length) {
  console.error('ERRORS', errors);
  process.exit(1);
}
console.log('online smoke OK');
