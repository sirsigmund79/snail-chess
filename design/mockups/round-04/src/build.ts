// npx tsx build.ts — renders the three states; legal squares come from the real engine.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './layout.mjs';
import { legalFrom } from './legal';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(join(out, 'idle.html'), render({ state: 'idle' }));
writeFileSync(join(out, 'selected.html'), render({ state: 'selected', legal: legalFrom('c4') }));
writeFileSync(join(out, 'rules.html'), render({ state: 'rules' }));
console.log('legal from c4:', legalFrom('c4').join(' '));
