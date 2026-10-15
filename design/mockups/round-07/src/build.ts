// npx tsx build.ts — each hyperpop colorway with a piece selected and both snails visible.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../../round-05/src/layout.mjs';
import { legalFrom } from '../../round-05/src/legal';
import { COLORWAYS } from './colorways.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const c of COLORWAYS) {
  writeFileSync(join(out, `${c.id}.html`), render({ state: 'selected', legal: legalFrom('c4'), boardCss: c.css }));
  writeFileSync(join(out, `${c.id}-snails.html`), render({ state: 'snails', boardCss: c.css }));
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify({
  schemaVersion: 1, lang: 'en', project: 'Immortal Snail Chess', round: '07', nativeViewport: '390x844',
  brief: 'Just for fun: hyperpop colorways of the round-05 layout. Bishop selected (legal colour) with both snails and their next squares (snail colour) visible.',
  candidates: COLORWAYS.map((c) => ({ id: c.id, name: c.name, concept: c.note, typography: 'Figtree (unchanged); gradient wordmark', palette: c.palette, traits: ['One colour = legal moves', 'One colour = snails'], source: `${c.id}.html` })),
}, null, 2));
console.log('built', COLORWAYS.length, 'colorways');
