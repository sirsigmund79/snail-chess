// npx tsx build.ts — every board option in the busiest state (bishop selected, snails visible).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../../round-05/src/layout.mjs';
import { legalFrom } from '../../round-05/src/legal';
import { BOARDS } from './boards.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const b of BOARDS) writeFileSync(join(out, `${b.id}.html`), render({ state: 'selected', legal: legalFrom('c4'), boardCss: b.css }));
writeFileSync(
  join(out, 'manifest.json'),
  JSON.stringify({
    schemaVersion: 1, lang: 'en', project: 'Immortal Snail Chess', round: '06', nativeViewport: '390x844',
    brief: "Board surface options for the round-05 layout, each in the busiest state: your bishop on c4 is selected (blue = legal squares) while both snails and their next squares (coral) are on the board.",
    candidates: BOARDS.map((b) => ({ id: b.id, name: b.name, concept: b.note, typography: 'Figtree (unchanged)', palette: b.palette, traits: ['Same layout as round 05', 'Blue = legal, coral = snail'], source: `${b.id}.html`, ...(b.id === 'hatch' ? { baseline: true } : {}) })),
  }, null, 2),
);
console.log('built', BOARDS.length, 'boards');
