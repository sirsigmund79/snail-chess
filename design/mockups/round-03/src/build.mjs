import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './layout.mjs';
import { THEMES } from './themes.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const t of THEMES) {
  writeFileSync(join(out, `${t.id}.html`), render(t));
  writeFileSync(join(out, `${t.id}-rules.html`), render(t, { rules: true }));
}
console.log('wrote', THEMES.length * 2, 'pages');
