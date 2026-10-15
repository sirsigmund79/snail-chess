/**
 * Verifies PostHog analytics end to end without sending anything anywhere.
 *
 *   VITE_POSTHOG_KEY=phc_test VITE_POSTHOG_HOST=https://ph.invalid npx vite build --outDir /tmp/dist-ph
 *   npx vite preview --outDir /tmp/dist-ph --port 4190 &
 *   npx tsx scripts/check-analytics.ts http://localhost:4190/
 *
 * The browser intercepts every request to the (fake) PostHog host, decodes the events, plays a
 * quick game (Scholar's mate) and checks for $pageview, game_started and game_ended. It also
 * checks that no cookies or localStorage were written.
 */
import { gunzipSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:4190/';
// PostHog ignores obvious bots, so hide the automation flag (a real visitor never has it).
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});

const events: { event: string; props: Record<string, unknown> }[] = [];
await page.route('https://ph.invalid/**', async (route) => {
  const req = route.request();
  const u = new URL(req.url());
  const body = req.postDataBuffer();
  if (body && req.method() === 'POST' && !u.pathname.startsWith('/flags')) {
    const c = u.searchParams.get('compression');
    const gzipped = c === 'gzip-js' || (body[0] === 0x1f && body[1] === 0x8b);
    let text = gzipped ? gunzipSync(body).toString() : body.toString();
    if (c === 'base64' || text.startsWith('data=')) text = Buffer.from(decodeURIComponent(text.replace(/^data=/, '')), 'base64').toString();
    const data = JSON.parse(text);
    for (const e of Array.isArray(data) ? data : data.batch ?? [data]) {
      if (e?.event) {
        const props = Object.fromEntries(Object.entries(e.properties ?? {}).filter(([k]) => !k.startsWith('$') && !['token', 'distinct_id'].includes(k)));
        events.push({ event: e.event, props });
      }
    }
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
});

await page.goto(url);
await page.waitForSelector('[data-square="a1"]');
await page.click('button[aria-label="Menu"]');
await page.click('.sheet >> text=Friend (same phone)');
await page.click('text=Start new game');
const move = async (f: string, t: string) => {
  await page.waitForFunction(() => !document.querySelector('[data-testid="snail-banner"], .dot-snail.moving'), null, { timeout: 15000 });
  await page.click(`[data-square="${f}"]`);
  await page.click(`[data-square="${t}"]`);
};
for (const [f, t] of [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6']]) await move(f, t);
await page.keyboard.press('Space');
await move('h5', 'f7');
await page.waitForSelector('[data-testid="result"]');
await page.waitForTimeout(5000); // PostHog flushes its batch every few seconds
const storage = { cookies: (await page.context().cookies()).length, localStorage: await page.evaluate(() => localStorage.length) };
await browser.close();

for (const e of events) console.log(e.event, JSON.stringify(e.props));
console.log('storage:', JSON.stringify(storage));
const names = events.map((e) => e.event);
const problems = [
  ...['$pageview', 'game_started', 'game_ended'].filter((n) => !names.includes(n)).map((n) => `missing ${n}`),
  ...(names.filter((n) => n === 'game_started').length > 1 ? ['game_started sent twice'] : []),
  ...(storage.cookies || storage.localStorage ? ['analytics wrote cookies or localStorage'] : []),
];
if (problems.length) {
  console.error('FAIL:', problems.join('; '));
  process.exit(1);
}
console.log('analytics OK');
