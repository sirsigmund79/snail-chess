// npx tsx build.ts — renders every state; positions, legal squares and endings come from the real engine.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKMATE, SLIMED_MOMENT, SLIMED_RESULT, SUMMARY } from './endings';
import { render } from './layout.mjs';
import { legalFrom } from './legal';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
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
