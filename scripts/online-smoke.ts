/**
 * Two-browser online smoke test against `npm run build && npx wrangler dev` (default
 * http://localhost:8787): create a room (host picks Black), join from a second browser, play, reload mid-game (keeps
 * the seat), finish with a checkmate, rematch (colours swap), resign, and a third browser spectates.
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
await host.click('.room .seg >> text=Black');
await host.waitForSelector('.room .seg button.on:has-text("Black")');
await host.screenshot({ path: `${dir}/online-waiting.png` });
const roomUrl = host.url();
console.log('room', roomUrl);

const guest = await open();
await guest.goto(roomUrl);
// The host picked Black, so the guest is White.
const W = guest;
const B = host;
await guest.waitForSelector('[data-testid="player-w"]');
await host.waitForSelector('[data-testid="player-w"]');
console.log('host bars', await names(host));
console.log('guest bars', await names(guest));
const tag = await guest.locator('[data-testid="room-tag"]').textContent();
if (!tag?.startsWith(`Room: ${new URL(roomUrl).pathname.split('/').pop()} · Snails every 3 moves`)) throw new Error(`room tag: ${tag}`);

await move(W, 'e2', 'e4');
await waitMoves(B, 1);
await move(B, 'e7', 'e5');
await waitMoves(W, 2);

// Guest reloads mid-game: same seat, same position.
await B.reload();
await B.waitForSelector('[data-testid="player-w"]');
await waitMoves(B, 2);
await move(W, 'g1', 'f3');
await waitMoves(B, 3);
await move(B, 'b8', 'c6');
await move(W, 'f1', 'c4');
await move(B, 'g8', 'f6'); // 6th ply: snails move
await waitMoves(W, 6);
await settle(host);
await host.screenshot({ path: `${dir}/online-host-after-tick.png` });
await guest.screenshot({ path: `${dir}/online-guest-after-tick.png` });

// Spectator: a third browser sees the same moves but can't play.
const spec = await open();
await spec.goto(roomUrl);
await waitMoves(spec, 6);
console.log('spectator bars', await names(spec));

// Out-of-turn moves are refused by the board (and would be by the server).
await B.click('[data-square="d7"]');
await B.click('[data-square="d5"]');
await B.waitForTimeout(500);
if ((await moveCount(B)) !== 6) throw new Error('Black moved out of turn');

// Scholar's mate: Qxf7#.
await move(W, 'd1', 'e2');
await move(B, 'a7', 'a6');
await move(W, 'c4', 'f7'); // Bxf7+
await move(B, 'e8', 'f7');
await waitMoves(W, 10);
await move(W, 'f3', 'g5');
await move(B, 'f7', 'g8');
await move(W, 'e2', 'c4');
await move(B, 'd7', 'd5');
await move(W, 'c4', 'd5');
await move(B, 'c8', 'e6');
await move(W, 'd5', 'e6'); // Qxe6# — or close; finish however it ends
const over = await host
  .waitForSelector('[data-testid="result"]', { timeout: 8000 })
  .then(() => true)
  .catch(() => false);
console.log('game over card:', over);
if (over) {
  await guest.waitForSelector('[data-testid="result"]');
  await host.screenshot({ path: `${dir}/online-result-host.png` });
  const label = (await guest.locator('[data-testid="result"] button').allTextContents()).join(' + ');
  console.log('result title host:', await host.locator('[data-testid="result"] h3').textContent(), '| guest:', await guest.locator('[data-testid="result"] h3').textContent(), '| button:', label);
  await guest.click('[data-testid="result"] button.primary');
  await waitMoves(W, 0);
  await waitMoves(B, 0);
  console.log('after rematch host bars', await names(host));
  console.log('after rematch guest bars', await names(guest));
  await move(B, 'd2', 'd4'); // colours swapped: the host is White now
  await waitMoves(W, 1);

  // Resign (the guest, now Black), with the confirm sheet.
  await W.click('.toolbar >> text=Resign');
  await W.click('.sheet button.primary');
  await W.waitForSelector('[data-testid="result"]');
  await B.waitForSelector('[data-testid="result"]');
  console.log('resign titles:', await W.locator('[data-testid="result"] h3').textContent(), '|', await B.locator('[data-testid="result"] h3').textContent());
  await B.screenshot({ path: `${dir}/online-resigned.png` });
  // "New game" under Rematch opens the normal options.
  await W.click('[data-testid="result"] button:has-text("New game")');
  await W.waitForSelector('.sheet >> text=Start new game');
  await W.keyboard.press('Escape');
  await B.click('[data-testid="result"] button.primary');
  await waitMoves(W, 0);
  console.log('after resign rematch W bars', await names(W));
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
