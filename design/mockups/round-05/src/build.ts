// npx tsx build.ts — renders the states; the position and legal squares come from the real engine.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './layout.mjs';
import { legalFrom } from './legal';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(join(out, 'idle.html'), render({ state: 'idle' }));
writeFileSync(join(out, 'selected.html'), render({ state: 'selected', legal: legalFrom('c4') }));
writeFileSync(join(out, 'snails.html'), render({ state: 'snails' }));
writeFileSync(join(out, 'rules.html'), render({ state: 'rules' }));
console.log('built 4 states');
