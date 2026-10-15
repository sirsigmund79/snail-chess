// Round 03 — the Paper layout, revised:
//   opponent + rules/menu · moves strip · (space) · you + snail countdown · board · Undo/Rules/New
// The board sits right above the buttons so it's in thumb reach. One layout, many themes.
import { cells, LOG, STATUS } from '../../round-01/src/scene.mjs';
import { piece } from '../../round-02/src/pieces.mjs';

// Paper's snail icon, unchanged.
const snail = (side, cls = 'snail') => `<svg class="${cls} s-${side}" viewBox="0 0 40 40" aria-hidden="true">
  <rect x="5" y="25" width="30" height="8" rx="4" class="foot"/>
  <path d="M30 26 L33 15 M33 26 L37 17" class="horn"/>
  <circle cx="18" cy="20" r="11" class="shell"/>
  <path d="M18 20 m0-2.5 a2.5 2.5 0 1 1 -2.5 2.5 a5 5 0 0 1 5 -5 a7.5 7.5 0 0 1 7.5 7.5" class="spiral"/>
</svg>`;

function board() {
  return cells().map((c) => {
    const cls = ['sq', c.light ? 'l' : 'd', c.target ? 'next' : ''].join(' ');
    const inner = c.snail ? snail(c.snail) : c.piece ? piece(c.piece.color, c.piece.type) : '';
    const coord = (c.file === 0 ? `<i class="r">${c.rank}</i>` : '') + (c.rank === 1 ? `<i class="f">${c.sq[0]}</i>` : '');
    return `<div class="${cls}">${inner}${coord}</div>`;
  }).join('');
}

// Scoresheet: move pairs in reading order, filling from the bottom so the newest sit right above
// the board. A small snail after a pair marks a snail step (coral shell = something was crushed).
const moves = () =>
  LOG.map((m) => {
    const step = m.snails ? `<span class="step${m.snails.some((s) => s.crushed) ? ' crush' : ''}">${snail('w', 'tiny')}</span>` : '';
    return `<li><b>${m.n}</b><span>${m.w}</span><span>${m.b}</span>${step}</li>`;
  }).join('') + '<li class="now"><b>9</b><span>…</span></li>';

// Countdown: three dots (one per move in the cycle) then the snail. No words.
const countdown = () => {
  const done = 3 - STATUS.movesUntilSnails;
  const dots = [0, 1, 2].map((i) => `<span class="dot ${i < done ? 'on' : ''} ${i === done ? 'next' : ''}"></span>`).join('');
  return `<div class="count" role="img" aria-label="Snails move after Black's next move">${dots}${snail('w', `count-snail ${STATUS.movesUntilSnails === 1 ? 'soon' : ''}`)}</div>`;
};

const RULES = [
  ['Two snails, one each.', 'Yours crawls toward their king. Theirs crawls toward yours.'],
  ['Every three moves, they step.', 'After Black moves, each snail moves one square closer. The dots count down.'],
  ['Snails crush.', 'Whatever is on the square they land on is gone. A crushed king loses the game.'],
  ['Snails are walls.', 'Nothing can land on or pass through a snail. Knights can still jump over.'],
  ['Everything else is chess.', 'Checkmate still wins.'],
];

const rulesSheet = () => `<div class="scrim"></div>
<section class="sheet" role="dialog" aria-label="Rules">
  <div class="grip"></div>
  <h2>How snails work</h2>
  <ol>${RULES.map(([h, p]) => `<li><b>${h}</b> ${p}</li>`).join('')}</ol>
  <button class="done">Got it</button>
</section>`;

const icon = {
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  rules: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
};

/**
 * @param t theme: { name, fonts: [[family, weight, file]], ui, mono?, c: { bg, ink, soft, line, light, dark, accent, btn, avatarBg, avatarInk, coord, snailW, snailB, foot } }
 */
export function render(t, { rules = false } = {}) {
  const c = t.c;
  const faces = t.fonts.map(([fam, w, file]) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(fonts/${file}) format('woff2')}`).join('\n');
  const num = t.mono ? `'${t.mono}',` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Immortal Snail Chess — ${t.name}${rules ? ' (rules)' : ''}</title>
<style>
${faces}
:root{--bg:${c.bg};--ink:${c.ink};--soft:${c.soft};--line:${c.line};--light:${c.light};--dark:${c.dark};--accent:${c.accent};--btn:${c.btn};--coord:${c.coord}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--bg);color:var(--ink);font:400 15px/1.45 '${t.ui}',system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
button{font:inherit;color:inherit;border:0;background:none}
.app{height:100%;max-width:430px;margin:0 auto;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 12px) 0 calc(env(safe-area-inset-bottom) + 14px)}

.top{display:flex;align-items:center;gap:12px;padding:6px 14px 6px 20px}
.avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;flex:none;background:${c.avatarBg};color:${c.avatarInk}}
.who{flex:1;min-width:0}
.who b{display:block;font-weight:700;font-size:16px}
.who span{display:block;color:var(--soft);font-size:13px}
.iconbtn{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:var(--soft)}
.iconbtn svg{width:22px;height:22px}

.moves{flex:1;min-height:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:max-content;align-content:end;
  column-gap:18px;padding:14px 22px 14px;font-size:15px;overflow:hidden;
  -webkit-mask-image:linear-gradient(180deg,transparent,#000 30%);mask-image:linear-gradient(180deg,transparent,#000 30%)}
.moves li{display:grid;grid-template-columns:24px 1fr 1fr 22px;align-items:center;height:30px;border-bottom:1px solid var(--line)}
.moves b{font-weight:500;color:var(--soft);font-size:13px;${t.mono ? `font-family:${num}monospace;` : ''}}
.moves .now span{color:var(--accent);font-weight:700}
.step{display:grid;place-items:center}
.tiny{width:22px;height:22px}
.step.crush .tiny .shell{fill:var(--accent)}


.status{display:flex;align-items:center;gap:12px;padding:0 20px 10px}
.status .avatar{width:32px;height:32px;font-size:12px}
.status .who b{font-size:15px}
.status .who span{color:var(--accent)}
.count{display:flex;align-items:center;gap:6px}
.dot{width:9px;height:9px;border-radius:50%;background:var(--line)}
.dot.on{background:var(--ink)}
.dot.next{background:var(--accent)}
.count-snail{width:26px;height:26px;margin-left:2px}
.count-snail.soon .shell{fill:var(--accent)}

.board{display:grid;grid-template-columns:repeat(8,1fr);margin:0 12px;border-radius:8px;overflow:hidden;aspect-ratio:1}
.sq{position:relative;display:grid;place-items:center}
.sq.l{background:var(--light)}
.sq.d{background:var(--dark)}
.sq.next{background:color-mix(in srgb,var(--light),var(--accent) 22%)}
.sq.next.d{background:color-mix(in srgb,var(--dark),var(--accent) 26%)}
.sq.next::after{content:"";width:28%;aspect-ratio:1;border-radius:50%;background:var(--accent);position:absolute}
.sq.next .pc{position:relative;z-index:1}
.pc{width:88%;height:88%}
.snail{width:86%;height:86%}
.foot{fill:${c.foot};stroke:${c.snailOutline ?? 'var(--ink)'};stroke-width:1.6}
.horn{stroke:${c.snailOutline ?? 'var(--ink)'};stroke-width:1.6;stroke-linecap:round}
.shell{stroke:${c.snailOutline ?? 'var(--ink)'};stroke-width:1.6}
.s-w .shell{fill:${c.snailW}}
.s-b .shell{fill:${c.snailB}}
.spiral{fill:none;stroke-width:1.5;stroke-linecap:round}
.s-w .spiral{stroke:${c.snailOutline ?? 'var(--ink)'}}
.s-b .spiral{stroke:${c.snailW}}
.count-snail .foot,.tiny .foot{fill:${c.foot}}
.sq i{position:absolute;font:500 9px '${t.ui}';font-style:normal;color:var(--coord)}
.sq i.r{top:2px;left:3px}
.sq i.f{bottom:1px;right:3px}

.bar{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 16px 0}
.bar button{height:52px;border-radius:14px;background:var(--btn);font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px}
.bar svg{width:18px;height:18px}

.scrim{position:fixed;inset:0;background:rgba(0,0,0,.32);z-index:10}
.sheet{z-index:11;position:fixed;left:0;right:0;bottom:0;max-width:430px;margin:0 auto;background:var(--bg);border-radius:22px 22px 0 0;padding:10px 22px calc(env(safe-area-inset-bottom) + 18px);box-shadow:0 -10px 30px rgba(0,0,0,.15)}
.grip{width:38px;height:5px;border-radius:3px;background:var(--line);margin:0 auto 14px}
.sheet h2{font:700 20px/1.2 '${t.display ?? t.ui}',sans-serif;margin-bottom:10px}
.sheet ol{list-style:none;counter-reset:r}
.sheet li{position:relative;padding:9px 0 9px 32px;border-top:1px solid var(--line);font-size:15px;color:var(--soft)}
.sheet li b{color:var(--ink);font-weight:700}
.sheet li::before{counter-increment:r;content:counter(r);position:absolute;left:0;top:9px;width:22px;height:22px;border-radius:50%;background:var(--btn);color:var(--ink);font-size:12px;font-weight:700;display:grid;place-items:center}
.done{width:100%;height:52px;margin-top:12px;border-radius:14px;background:var(--ink)!important;color:var(--bg)!important;font-weight:700!important}
</style></head>
<body><main class="app">
  <header class="top">
    <div class="avatar">S</div>
    <div class="who"><b>Snailfish</b><span>Medium · ${STATUS.theirKingDistance} from your snail</span></div>
    <button class="iconbtn" aria-label="Rules">${icon.rules}</button>
    <button class="iconbtn" aria-label="Menu">${icon.more}</button>
  </header>
  <ol class="moves" aria-label="Moves">${moves()}</ol>
  <section class="status">
    <div class="avatar">You</div>
    <div class="who"><b>Your move</b><span>${STATUS.yourKingDistance} squares from Black's snail</span></div>
    ${countdown()}
  </section>
  <div class="board">${board()}</div>
  <nav class="bar">
    <button>${icon.undo}Undo</button>
    <button>${icon.rules}Rules</button>
    <button>${icon.plus}New</button>
  </nav>
</main>${rules ? rulesSheet() : ''}</body></html>`;
}
