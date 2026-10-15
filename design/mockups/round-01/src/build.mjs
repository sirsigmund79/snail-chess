// Renders each direction's template to a static HTML file next to manifest.json.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ['garden', 'field-notes', 'b-movie']) {
  const { default: render } = await import(`./${name}.mjs`);
  writeFileSync(join(out, `${name}.html`), render());
  console.log('wrote', `${name}.html`);
}
