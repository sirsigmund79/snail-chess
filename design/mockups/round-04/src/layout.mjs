// Round 04 — Really Bad Chess colour × chess.com layout, by Proven / Better / New.
//   app bar (menu · snail countdown · rules) · move strip · space · opponent bar · board · your bar · toolbar
import { cells, LOG, SNAILS, STATUS } from '../../round-01/src/scene.mjs';
import { piece } from '../../round-02/src/pieces.mjs';
import { RULES, snail } from '../../round-03/src/layout.mjs';

const icon = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  rules: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/></svg>',
  moves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

function board({ selected = null, legal = [] }) {
  return cells().map((c) => {
    const cls = ['sq', c.light ? 'l' : 'd'];
    if (c.target) cls.push('snail-next');
    if (legal.includes(c.sq)) cls.push('legal');
    if (selected === c.sq) cls.push('sel');
    const inner = c.snail ? `<span class="token t-${c.snail}">${snail(c.snail)}</span>` : c.piece ? piece(c.piece.color, c.piece.type) : '';
    return `<div class="${cls.join(' ')}">${inner}</div>`;
  }).join('');
}

const strip = () =>
  LOG.flatMap((m) => [
    `<span class="mv"><b>${m.n}.</b>${m.w}</span>`,
    `<span class="mv">${m.b}</span>`,
    ...(m.snails ? [`<span class="mv sn${m.snails.some((s) => s.crushed) ? ' crush' : ''}">${snail('w', 'tiny')}</span>`] : []),
  ]).join('') + '<span class="mv now"><b>9.</b>…</span>';

const countdown = () => {
  const done = 3 - STATUS.movesUntilSnails;
  return `<div class="count" role="img" aria-label="Snails move after Black's next move">${[0, 1, 2]
    .map((i) => `<span class="dot ${i < done ? 'on' : ''} ${i === done ? 'next' : ''}"></span>`).join('')}${snail('w', `count-snail ${STATUS.movesUntilSnails === 1 ? 'soon' : ''}`)}</div>`;
};

// Player bar: chess.com's name row, with the snail distance in the clock slot.
const bar = ({ name, sub, avatar, dist, danger, turn, hunter }) => `<section class="pbar${turn ? ' turn' : ''}">
  <div class="av">${avatar}</div>
  <div class="nm"><b>${name}</b> <span>${sub}</span>${turn ? ' <em>· your move</em>' : ''}</div>
  <div class="clock${danger ? ' danger' : ''}" aria-label="Enemy snail ${dist} squares from this king">${snail(hunter, 'tiny')}<b>${dist}</b></div>
</section>`;

const sheet = () => `<div class="scrim"></div><section class="sheet" role="dialog" aria-label="Rules"><div class="grip"></div>
  <h2>How snails work</h2><ol>${RULES.map(([h, p]) => `<li><b>${h}</b> ${p}</li>`).join('')}</ol><button class="done">Got it</button></section>`;

export function render({ state = 'idle', legal = [] } = {}) {
  const selected = state === 'selected' ? 'c4' : null;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Immortal Snail Chess — ${state}</title>
<style>
@font-face{font-family:Figtree;font-weight:500;src:url(fonts/figtree-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:Figtree;font-weight:700;src:url(fonts/figtree-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:Figtree;font-weight:800;src:url(fonts/figtree-latin-800-normal.woff2) format('woff2')}
:root{--ink:#111;--soft:#8a8a8a;--line:#e6e6e6;--blue:#2e9bff;--coral:#ff5a4e;--pink:#ffb3b3;--hatch:repeating-linear-gradient(135deg,var(--ink) 0 1.3px,transparent 1.3px 6px)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:#fff;color:var(--ink);font:500 15px/1.4 Figtree,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
button{font:inherit;color:inherit;border:0;background:none}
.app{height:100%;max-width:430px;margin:0 auto;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 6px) 0 env(safe-area-inset-bottom)}

.appbar{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;padding:0 6px;height:52px}
.appbar .ib{width:44px;height:44px;display:grid;place-items:center}
.appbar .ib svg{width:24px;height:24px}
.count{justify-self:center;display:flex;align-items:center;gap:7px}
.dot{width:10px;height:10px;border-radius:50%;border:2px solid var(--ink)}
.dot.on{background:var(--ink)}
.dot.next{background:var(--coral);border-color:var(--coral)}
.count-snail{width:30px;height:30px}
.count-snail.soon .shell{fill:var(--coral)}

.strip{display:flex;gap:4px;justify-content:flex-end;align-items:center;padding:4px 10px 0;white-space:nowrap;overflow:hidden;font-weight:700;font-size:15px;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 22%);mask-image:linear-gradient(90deg,transparent,#000 22%)}
.mv{display:inline-flex;align-items:center;gap:4px;padding:4px 6px;border-radius:6px}
.mv b{color:var(--soft);font-weight:700}
.mv.now{background:var(--ink);color:#fff}
.mv.now b{color:#fff}
.mv.sn{padding:2px}
.tiny{width:22px;height:22px}
.mv.crush .shell{fill:var(--coral)}

.space{flex:1}

.pbar{display:flex;align-items:center;gap:10px;padding:8px 12px}
.av{width:38px;height:38px;border-radius:8px;display:grid;place-items:center;font-weight:800;font-size:15px;background:var(--ink);color:#fff;flex:none}
.pbar.you .av{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2.5px var(--ink)}
.nm{flex:1;min-width:0;font-size:16px}
.nm b{font-weight:800}
.nm span{color:var(--soft);font-weight:700}
.nm em{font-style:normal;font-weight:800;color:var(--ink)}
.clock{display:flex;align-items:center;gap:6px;height:38px;min-width:76px;justify-content:center;padding:0 12px;border-radius:8px;background:#f1f1f1;font-weight:800;font-size:20px}
.clock.danger{background:var(--coral);color:#fff}
.clock.danger .foot{fill:#ffd2cf}

.board{display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1;border-top:5px solid var(--pink)}
.sq{position:relative;display:grid;place-items:center;background:#fff}
.sq.d{background:var(--hatch),#fff}
.sq.snail-next{background:var(--coral)}
.sq.snail-next.d{background:var(--hatch),var(--coral)}
.sq.legal,.sq.sel{background:var(--blue)}
.sq.legal.d,.sq.sel.d{background:var(--hatch),var(--blue)}
.sq.sel{box-shadow:inset 0 0 0 4px var(--ink)}
.sq.legal.snail-next::after{content:"";position:absolute;inset:5px;border:4px solid var(--coral);border-radius:3px}
.pc{width:90%;height:90%;position:relative;z-index:1}
.sq.d .pc,.sq.legal .pc{filter:drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1px #fff)}
.token{width:84%;aspect-ratio:1;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 0 0 3px var(--coral)}
.token .snail{width:88%;height:88%}
.foot{fill:#f4f4f4;stroke:var(--ink);stroke-width:1.8}
.horn{stroke:var(--ink);stroke-width:1.8;stroke-linecap:round}
.shell{stroke:var(--ink);stroke-width:1.8}
.s-w .shell{fill:#fff}
.s-b .shell{fill:var(--ink)}
.spiral{fill:none;stroke-width:1.6;stroke-linecap:round}
.s-w .spiral{stroke:var(--ink)}
.s-b .spiral{stroke:#fff}

.toolbar{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);margin-top:6px}
.toolbar button{height:58px;display:grid;justify-items:center;align-content:center;gap:2px;font-weight:700;font-size:12px}
.toolbar svg{width:24px;height:24px}

.scrim{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:10}
.sheet{z-index:11;position:fixed;left:0;right:0;bottom:0;max-width:430px;margin:0 auto;background:#fff;border-radius:18px 18px 0 0;border-top:5px solid var(--pink);padding:10px 22px calc(env(safe-area-inset-bottom) + 18px)}
.grip{width:38px;height:5px;border-radius:3px;background:var(--line);margin:0 auto 14px}
.sheet h2{font:800 22px/1.2 Figtree;margin-bottom:10px}
.sheet ol{list-style:none;counter-reset:r}
.sheet li{position:relative;padding:9px 0 9px 34px;border-top:1px solid var(--line);font-size:15px;color:#555}
.sheet li b{color:var(--ink);font-weight:800}
.sheet li::before{counter-increment:r;content:counter(r);position:absolute;left:0;top:9px;width:24px;height:24px;border-radius:6px;background:var(--ink);color:#fff;font-size:13px;font-weight:800;display:grid;place-items:center}
.done{width:100%;height:54px;margin-top:12px;border-radius:12px;background:var(--ink);color:#fff;font-weight:800;font-size:16px}
</style></head>
<body><main class="app">
  <header class="appbar"><button class="ib" aria-label="Menu">${icon.menu}</button>${countdown()}<button class="ib" aria-label="Rules">${icon.rules}</button></header>
  <div class="strip">${strip()}</div>
  <div class="space"></div>
  ${bar({ name: 'Snailfish', sub: '(Medium)', avatar: 'S', dist: STATUS.theirKingDistance, danger: false, hunter: 'w' })}
  <div class="board">${board({ selected, legal })}</div>
  <div class="you">${bar({ name: 'You', sub: '(White)', avatar: 'You', dist: STATUS.yourKingDistance, danger: true, turn: true, hunter: 'b' }).replace('class="pbar', 'class="pbar you')}</div>
  <nav class="toolbar">
    <button>${icon.moves}Moves</button><button>${icon.rules}Rules</button><button>${icon.undo}Undo</button><button>${icon.plus}New</button>
  </nav>
</main>${state === 'rules' ? sheet() : ''}</body></html>`;
}
