/**
 * Pre-renders the SLIMED wordmark in Pricedown (the GTA "wasted" font) to a transparent PNG.
 *
 *   npx tsx scripts/render-slimed.ts "path/to/Pricedown Bl.otf" [out.png]
 *
 * Why an image: Pricedown's free Typodermic Desktop License doesn't cover webfonts, apps or games,
 * or sharing the font file, but it allows pre-rendered static graphics. So the game ships only
 * this PNG. Keep the font file outside the repo (or in fonts-local/, which is gitignored).
 */
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [fontArg, outArg = 'public/slimed.png'] = process.argv.slice(2);
if (!fontArg || !existsSync(fontArg)) {
  console.error('Usage: npx tsx scripts/render-slimed.ts "path/to/Pricedown Bl.otf" [out.png]');
  process.exit(1);
}
// Embedded as a data URL so the page can load it; it only exists in memory during rendering.
const fontUrl = `data:font/otf;base64,${readFileSync(fontArg).toString('base64')}`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:Pricedown;src:url("${fontUrl}")}
html,body{margin:0;background:transparent}
#w{display:inline-block;padding:24px 36px 34px;font:400 220px/1 Pricedown;letter-spacing:.01em;
  color:#9be22d;-webkit-text-stroke:14px #0e2400;paint-order:stroke fill;
  text-shadow:0 10px 0 #0e2400,0 18px 22px rgba(0,0,0,.45)}
</style></head><body><span id="w">slimed</span></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1600, height: 500 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const loaded = await page.evaluate(() => document.fonts.check('220px Pricedown'));
if (!loaded) {
  console.error('The font did not load; check the file path.');
  process.exit(1);
}
await page.locator('#w').screenshot({ path: outArg, omitBackground: true });
await browser.close();
console.log('wrote', outArg);
