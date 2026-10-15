// Inline piece SVGs from the Cburnett set (CC BY-SA 3.0, Wikimedia Commons; sprite via
// cm-chessboard, MIT). Each piece becomes a standalone <svg> so mockups need no external files.
import { readFileSync } from 'node:fs';

const sprite = readFileSync(new URL('./pieces-cburnett.svg', import.meta.url), 'utf8');
const groups = {};
for (const id of ['wk', 'wq', 'wr', 'wb', 'wn', 'wp', 'bk', 'bq', 'br', 'bb', 'bn', 'bp']) {
  const start = sprite.indexOf(`<g id="${id}"`);
  // Walk nested <g> tags to find this group's closing tag.
  let depth = 0;
  let i = start;
  const re = /<\/?g\b[^>]*>/g;
  re.lastIndex = start;
  for (let m; (m = re.exec(sprite)); ) {
    depth += m[0].startsWith('</') ? -1 : m[0].endsWith('/>') ? 0 : 1;
    if (depth === 0) { i = re.lastIndex; break; }
  }
  groups[id] = sprite.slice(start, i).replace(/\sid="[^"]*"/g, '');
}

/** <svg> for a piece, e.g. piece('w', 'k'). */
export const piece = (color, type, cls = 'pc') =>
  `<svg class="${cls}" viewBox="0 0 40 40" aria-hidden="true">${groups[color + type]}</svg>`;
