// Round 05 — round 04 refined:
// • snails drawn plain on the board (no ring); their next squares stay coral
// • the snail-distance boxes are replaced by move dots: each player's three moves in the cycle,
//   with the snail after Black's dots (snails move right after Black). Coral only on the snails' move.
// • the active dot or icon is drawn slightly bolder
// • board sits a little higher; app bar shows the snail + "Immortal Snail Chess"
import { cells, LOG } from './scene.mjs';
import { piece } from '../../round-02/src/pieces.mjs';
import { snail } from '../../round-03/src/layout.mjs';

const resultCard = (r) => `<div class="dim"></div><section class="result" style="top:${r.top ?? '44%'}" role="dialog" aria-label="${r.title}">
  <div class="emblem ${r.kind}">${r.kind === 'snailwin' ? snail('b', 'emblem-snail') : piece('w', 'k')}</div>
  <h3>${r.title}</h3><p>${r.line}</p><p class="meta">${r.meta}</p>
  <button class="primary">Rematch</button>
  <div class="row"><button>Review</button><button>New game</button></div>
</section>`;

// Uses the pre-rendered Pricedown image (copied in by build.ts when public/slimed.png exists),
// otherwise a Bangers stand-in.
const slimedOverlay = (o) => `<div class="slimed" role="alert"><div class="band"></div><div>
  ${o.image ? `<img class="word-img" src="${o.image}" alt="Slimed">` : '<div class="word">slimed</div>'}
  <div class="cap">${o.caption}</div></div></div>`;

export const RULES = [
  ['Snails hunt the kings.', 'Each snail takes the most direct path to the opposite king.'],
  ['Every three moves, they step.', 'Each snail moves one square closer.'],
  ['Snails are unstoppable.', 'They capture anything on the square they land on. If a snail captures a king, game over.'],
  ['Snails are walls.', 'Nothing can land on or pass through a snail. Knights can still jump over.'],
  ['Everything else is chess.', 'Checkmate still wins.'],
];

const icon = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  rules: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/></svg>',
  moves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

function board({ cells: list, selected = null, legal = [] }) {
  return list.map((c) => {
    const cls = ['sq', c.light ? 'l' : 'd'];
    if (c.target) cls.push('snail-next');
    if (c.mark) cls.push(c.mark);
    if (legal.includes(c.sq)) cls.push('legal');
    if (selected === c.sq) cls.push('sel');
    const inner = c.snail ? snail(c.snail, 'snail board-snail') : c.piece ? piece(c.piece.color, c.piece.type) : '';
    return `<div class="${cls.join(' ')}">${inner}</div>`;
  }).join('');
}

const strip = (log, now) =>
  log.flatMap((m) => [
    `<span class="mv"><b>${m.n}.</b>${m.w}</span>`,
    ...(m.b ? [`<span class="mv">${m.b}</span>`] : []),
    ...(m.snails ? [`<span class="mv sn">${snail('w', 'tiny')}</span>`] : []),
  ]).join('') + (now ? `<span class="mv now">${now}</span>` : '');

/**
 * Move dots for one player: `done` of their 3 moves this cycle are played; `active` marks the one
 * being played now. `snail` adds that player's snail after the dots, coral and bold only on the
 * snails' move.
 */
const dots = ({ done, active, snail: withSnail = false, snailsMoving = false, label }) =>
  `<div class="dots" role="img" aria-label="${label}">${[0, 1, 2]
    .map((i) => `<span class="dot${i < done ? ' on' : ''}${i === active ? ' active' : ''}"></span>`).join('')}${withSnail ? snail(withSnail, `dot-snail${snailsMoving ? ' active moving' : ''}`) : ''}</div>`;

const bar = ({ name, sub, avatar, you = false, turn = false, indicator }) => `<section class="pbar${you ? ' you' : ''}">
  <div class="av">${avatar}</div>
  <div class="nm"><b>${name}</b> <span>${sub}</span>${turn ? ' <em>· your move</em>' : ''}</div>
  ${indicator}
</section>`;

const sheet = () => `<div class="scrim"></div><section class="sheet" role="dialog" aria-label="How to play">
  <div class="grip"></div>
  <header class="sheet-head">${snail('w', 'head-snail')}<div><h2>Immortal Snail Chess</h2><p>How to play</p></div></header>
  <ol>${RULES.map(([h, p]) => `<li><b>${h}</b> ${p}</li>`).join('')}</ol><button class="done">Got it</button></section>`;

/** The default view: the round-05 mock position (ply 16, White to move). */
export const DEFAULT_VIEW = {
  cells: cells(),
  log: LOG,
  now: '<b>9.</b>…',
  dots: { w: { done: 2, active: 2 }, b: { done: 2, active: -1 }, snailsMoving: false },
  yourTurn: true,
};

export function render({ state = 'idle', legal = [], view = DEFAULT_VIEW } = {}) {
  const moving = state === 'snails' || view.dots.snailsMoving;
  const selected = state === 'selected' ? 'c4' : null;
  const dw = state === 'snails' ? { done: 3, active: -1 } : view.dots.w;
  const db = state === 'snails' ? { done: 3, active: -1 } : view.dots.b;
  const yourTurn = state !== 'snails' && view.yourTurn;
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
.brand{justify-self:center;display:flex;align-items:center;gap:6px;font:800 17px Figtree;letter-spacing:-.01em}
.brand-snail{width:28px;height:28px}

.strip{display:flex;gap:4px;justify-content:flex-end;align-items:center;padding:4px 10px 0;white-space:nowrap;overflow:hidden;font-weight:700;font-size:15px;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 22%);mask-image:linear-gradient(90deg,transparent,#000 22%)}
.mv{display:inline-flex;align-items:center;gap:4px;padding:4px 6px;border-radius:6px}
.mv b{color:var(--soft);font-weight:700}
.mv.now{background:var(--ink);color:#fff}
.mv.now b{color:#fff}
.mv.sn{padding:2px}
.tiny{width:22px;height:22px}

.space{flex:3}
.space-b{flex:1;max-height:40px}

.pbar{display:flex;align-items:center;gap:10px;padding:8px 12px}
.av{width:38px;height:38px;border-radius:8px;display:grid;place-items:center;font-weight:800;font-size:15px;background:var(--ink);color:#fff;flex:none}
.pbar.you .av{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2.5px var(--ink)}
.nm{flex:1;min-width:0;font-size:16px}
.nm b{font-weight:800}
.nm span{color:var(--soft);font-weight:700}
.nm em{font-style:normal;font-weight:800}

.dots{display:flex;align-items:center;gap:7px;height:38px;padding:0 4px}
.dot{width:10px;height:10px;border-radius:50%;border:1.6px solid var(--ink)}
.dot.on{background:var(--ink)}
.dot.active{width:13px;height:13px;border-width:3px}
.dot-snail{width:28px;height:28px;margin-left:1px}
.dot-snail.active{width:32px;height:32px}
.dot-snail.active .shell,.dot-snail.active .foot,.dot-snail.active .horn,.dot-snail.active .spiral{stroke-width:2.6}
.dot-snail.moving .shell{fill:var(--coral)}

.board{display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1;border-top:5px solid var(--pink)}
.sq{position:relative;display:grid;place-items:center;background:#fff}
.sq.d{background:var(--hatch),#fff}
.sq.snail-next{background:var(--coral)}
.sq.snail-next.d{background:var(--hatch),var(--coral)}
.sq.legal,.sq.sel{background:var(--blue)}
.sq.legal.d,.sq.sel.d{background:var(--hatch),var(--blue)}
.sq.sel{box-shadow:inset 0 0 0 4px var(--ink)}
.sq.legal.snail-next::after{content:"";position:absolute;inset:5px;border:4px solid var(--coral);border-radius:3px}
.pc,.board-snail{width:90%;height:90%;position:relative;z-index:1}
.sq.d .pc,.sq.legal .pc,.sq.d .board-snail{filter:drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1px #fff)}
.foot{fill:#f4f4f4;stroke:var(--ink);stroke-width:1.8}
.horn{stroke:var(--ink);stroke-width:1.8;stroke-linecap:round}
.shell{stroke:var(--ink);stroke-width:1.8}
.s-w .shell{fill:#fff}
.s-b .shell{fill:var(--ink)}
.spiral{fill:none;stroke-width:1.6;stroke-linecap:round}
.s-w .spiral{stroke:var(--ink)}
.s-b .spiral{stroke:#fff}

.sq.crushed{background:var(--coral)}
.sq.crushed.d{background:var(--hatch),var(--coral)}
.sq.mated{box-shadow:inset 0 0 0 5px var(--ink)}
.sq.mated::before{content:"#";position:absolute;top:1px;right:4px;font:800 13px Figtree;color:var(--ink);z-index:2}

.result{position:fixed;z-index:20;left:50%;transform:translate(-50%,-50%);width:min(320px,calc(100% - 40px));background:#fff;border-radius:16px;border-top:6px solid var(--pink);
  box-shadow:0 0 0 2px var(--ink),0 18px 40px rgba(0,0,0,.25);padding:14px 16px 14px;text-align:center}
.result .emblem{width:56px;height:56px;margin:0 auto 4px;display:grid;place-items:center;border-radius:14px}
.result .emblem.snailwin{background:var(--coral)}
.result .emblem.mate{background:var(--blue)}
.result .emblem svg{width:46px;height:46px}
.result h3{font:800 28px/1.1 Figtree;letter-spacing:-.01em;margin-top:4px}
.result p{font-weight:700;color:#555;margin-top:4px}
.result .meta{font-weight:700;color:var(--soft);font-size:13px;margin-top:6px}
.result .primary{width:100%;height:50px;margin-top:12px;border-radius:12px;background:var(--ink);color:#fff;font-weight:800;font-size:16px}
.result .row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.result .row button{height:46px;border-radius:12px;box-shadow:inset 0 0 0 2px var(--ink);font-weight:800}
.dim{position:fixed;inset:0;background:rgba(255,255,255,.55);z-index:19}

@font-face{font-family:Bangers;src:url(fonts/bangers-latin-400-normal.woff2) format('woff2')}
.slimed-world{filter:grayscale(1) contrast(1.1) brightness(.8)}
.slimed{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(28,25,23,.3)}
.slimed .band{position:absolute;left:0;right:0;top:50%;height:200px;transform:translateY(-50%);background:linear-gradient(180deg,transparent,rgba(0,0,0,.74) 18%,rgba(0,0,0,.74) 82%,transparent)}
.slimed .word{position:relative;text-transform:uppercase;font:400 92px/.9 Bangers,Impact,sans-serif;letter-spacing:.04em;color:#9be22d;-webkit-text-stroke:5px #0e2400;paint-order:stroke fill;text-shadow:0 4px 0 #4f8a0b,0 8px 12px rgba(0,0,0,.6);text-align:center}
.slimed .word-img{position:relative;display:block;width:min(330px,86vw);height:auto;margin:0 auto}
.slimed .cap{position:relative;margin-top:22px;font:800 13px Figtree;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.88);text-align:center}

.toolbar{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line)}
.toolbar button{height:58px;display:grid;justify-items:center;align-content:center;gap:2px;font-weight:700;font-size:12px}
.toolbar svg{width:24px;height:24px}

.scrim{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:10}
.sheet{z-index:11;position:fixed;left:0;right:0;bottom:0;max-width:430px;margin:0 auto;background:#fff;border-radius:18px 18px 0 0;border-top:5px solid var(--pink);padding:10px 22px calc(env(safe-area-inset-bottom) + 18px)}
.grip{width:38px;height:5px;border-radius:3px;background:var(--line);margin:0 auto 12px}
.sheet-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.head-snail{width:44px;height:44px;flex:none}
.sheet h2{font:800 22px/1.15 Figtree}
.sheet-head p{color:var(--soft);font-weight:700;font-size:14px}
.sheet ol{list-style:none;counter-reset:r}
.sheet li{position:relative;padding:9px 0 9px 34px;border-top:1px solid var(--line);font-size:15px;color:#555}
.sheet li b{color:var(--ink);font-weight:800}
.sheet li::before{counter-increment:r;content:counter(r);position:absolute;left:0;top:9px;width:24px;height:24px;border-radius:6px;background:var(--ink);color:#fff;font-size:13px;font-weight:800;display:grid;place-items:center}
.done{width:100%;height:54px;margin-top:12px;border-radius:12px;background:var(--ink);color:#fff;font-weight:800;font-size:16px}
</style></head>
<body><main class="app${view.slimed ? ' slimed-world' : ''}">
  <header class="appbar"><button class="ib" aria-label="Menu">${icon.menu}</button>
    <div class="brand">${snail('w', 'brand-snail')}Immortal Snail Chess</div>
    <button class="ib" aria-label="How to play">${icon.rules}</button></header>
  <div class="strip">${strip(view.log, view.now)}</div>
  <div class="space"></div>
  ${bar({ name: 'Snailfish', sub: '(Medium)', avatar: 'S', indicator: dots({ ...db, snail: 'b', snailsMoving: moving, label: moving ? 'The snails are moving' : `Black: ${db.done} of 3 moves played` }) })}
  <div class="board">${board({ cells: view.cells, selected, legal })}</div>
  ${bar({ name: 'You', sub: '(White)', avatar: 'You', you: true, turn: yourTurn, indicator: dots({ ...dw, snail: 'w', snailsMoving: moving, label: moving ? 'The snails are moving' : `White: ${dw.done} of 3 moves played` }) })}
  <div class="space-b"></div>
  <nav class="toolbar">
    <button>${icon.moves}Moves</button><button>${icon.rules}Rules</button><button>${icon.undo}Undo</button><button>${icon.plus}New</button>
  </nav>
</main>${state === 'rules' ? sheet() : ''}${view.result ? resultCard(view.result) : ''}${view.slimed ? slimedOverlay(view.slimed) : ''}</body></html>`;
}
