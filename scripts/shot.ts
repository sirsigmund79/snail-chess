/**
 * Minimal screenshot helper (fallback for the oil-ui shoot tool, which can't launch Chromium as
 * root here).   npx tsx scripts/shot.ts <url-or-file> <out.png> [width] [height] [waitMs]
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const [target, out, w = '1440', h = '900', wait = '800'] = process.argv.slice(2);
const url = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const proxy = /^https?:/.test(target) && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  ...(proxy ? { proxy } : {}),
});
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, ignoreHTTPSErrors: !!proxy });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 }).catch((e) => errors.push(String(e)));
await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
await browser.close();
console.log(out, errors.length ? `errors: ${errors.join(' | ')}` : 'ok');
