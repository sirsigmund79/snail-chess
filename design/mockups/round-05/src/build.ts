// npx tsx build.ts — renders every state; positions, legal squares and endings come from the real engine.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKMATE, SLIMED_MOMENT, SLIMED_RESULT, SUMMARY } from './endings';
import { render } from './layout.mjs';
import { legalFrom } from './legal';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
// Use the real Pricedown SLIMED image once scripts/render-slimed.ts has produced it.
const png = join(out, '../../../public/slimed.png');
if (existsSync(png)) {
  copyFileSync(png, join(out, 'slimed.png'));
  (SLIMED_MOMENT as { slimed: { image?: string } }).slimed.image = 'slimed.png';
}
const pages: Record<string, string> = {
  idle: render({ state: 'idle' }),
  selected: render({ state: 'selected', legal: legalFrom('c4') }),
  snails: render({ state: 'snails' }),
  rules: render({ state: 'rules' }),
  'end-slimed': render({ view: SLIMED_MOMENT }),
  'end-slimed-result': render({ view: SLIMED_RESULT }),
  'end-checkmate': render({ view: CHECKMATE }),
};
for (const [name, html] of Object.entries(pages)) writeFileSync(join(out, `${name}.html`), html);
console.log(SUMMARY);
