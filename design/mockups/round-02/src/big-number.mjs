// Direction B — Big Number: the countdown is the headline. One huge numeral says how many moves
// until the snails move; the board sits on a soft card; moves live in a bottom sheet.
import { cells, LOG, SNAILS, STATUS } from '../../round-01/src/scene.mjs';
import { piece } from './pieces.mjs';

const N = 8;
const c2xy = (sq) => [sq.charCodeAt(0) - 97 + 0.5, 8 - Number(sq[1]) + 0.5];

const snail = (side) => `<svg class="snail s-${side}" viewBox="0 0 40 40" aria-hidden="true">
  <ellipse cx="21" cy="33" rx="17" ry="4.5" class="foot"/>
  <circle cx="18" cy="19" r="14" class="shell"/>
  <circle cx="18" cy="19" r="6" class="core"/>
  <circle cx="35" cy="20" r="2.8" class="eye"/>
</svg>`;

function board() {
  const sq = cells().map((c) => {
    const inner = c.snail ? snail(c.snail) : c.piece ? piece(c.piece.color, c.piece.type) : '';
    return `<div class="sq ${c.light ? 'l' : 'd'} ${c.target ? 'next' : ''}">${inner}</div>`;
  }).join('');
  // Faint dotted paths: where each snail has been, then a short hop to where it goes next.
  const path = (side) => {
    const s = SNAILS[side];
    const pts = [...s.trail, s.square].map(c2xy);
    const been = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
    const [x0, y0] = c2xy(s.square);
    const [x1, y1] = c2xy(s.next);
    return `<path d="${been}" class="been"/><path d="M${x0} ${y0} L${x1} ${y1}" class="hop"/>`;
  };
  return `<div class="board">${sq}<svg class="paths" viewBox="0 0 ${N} ${N}">${path('w')}${path('b')}</svg></div>`;
}

const moveRows = () => LOG.slice(-3).map((m) => {
  const steps = (m.snails ?? []).map((s) => `<li class="step">${s.who} snail ${s.from} → ${s.to}${s.crushed ? ` · took ${s.crushed.replace("White's ", 'your ')}` : ''}</li>`).join('');
  return `<li><span class="n">${m.n}</span><span>${m.w}</span><span>${m.b}</span></li>${steps}`;
}).join('');

export default function render() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Immortal Snail Chess — Big Number</title>
<style>
@font-face{font-family:Manrope;font-weight:400;src:url(fonts/manrope-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:Manrope;font-weight:500;src:url(fonts/manrope-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:Manrope;font-weight:700;src:url(fonts/manrope-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:Manrope;font-weight:800;src:url(fonts/manrope-latin-800-normal.woff2) format('woff2')}
:root{--bg:#e6ece6;--ink:#1f3b3a;--soft:#6c807c;--card:#f7f9f6;--light:#f1f4ef;--dark:#c9d6cf;--amber:#ef9a2b;--amber-bg:rgba(239,154,43,.22)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--bg);color:var(--ink);font:500 15px/1.45 Manrope,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.app{min-height:100%;max-width:430px;margin:0 auto;display:flex;flex-direction:column;padding-top:calc(env(safe-area-inset-top) + 10px)}

.top{display:flex;justify-content:space-between;align-items:center;padding:8px 20px;color:var(--soft);font-size:14px}
.top button{border:0;background:none;color:var(--ink);font:700 14px Manrope}
.hero{display:flex;align-items:center;gap:14px;padding:4px 20px 10px}
.hero .num{font:800 112px/0.85 Manrope;letter-spacing:-.06em;color:var(--ink)}
.hero p{font:700 22px/1.15 Manrope;letter-spacing:-.01em}
.hero p span{display:block;font:500 14px/1.4 Manrope;color:var(--soft);margin-top:6px;letter-spacing:0}

.cardwrap{padding:0 14px}
.board{position:relative;display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1;border-radius:18px;overflow:hidden;background:var(--card);box-shadow:0 1px 0 rgba(31,59,58,.06),0 10px 30px rgba(31,59,58,.08)}
.sq{position:relative;display:grid;place-items:center}
.sq.l{background:var(--light)}
.sq.d{background:var(--dark)}
.sq.next{background:var(--amber-bg)}
.pc{width:86%;height:86%;position:relative;z-index:2}
.snail{width:96%;height:96%;position:relative;z-index:2}
.foot{fill:rgba(31,59,58,.18)}
.shell{stroke:var(--ink);stroke-width:2}
.s-w .shell{fill:#fff}
.s-b .shell{fill:var(--ink)}
.core{fill:var(--amber)}
.eye{fill:var(--ink)}
.paths{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
.been{fill:none;stroke:var(--ink);stroke-opacity:.22;stroke-width:.07;stroke-dasharray:.01 .18;stroke-linecap:round}
.hop{fill:none;stroke:var(--amber);stroke-width:.08;stroke-dasharray:.02 .16;stroke-linecap:round}

.who{display:flex;justify-content:space-between;padding:14px 22px 0;font-size:14px;color:var(--soft)}
.who b{color:var(--ink);font-weight:700}
.who .me{color:var(--ink)}
.who .me em{font-style:normal;color:#b56a0c;font-weight:700}

.sheet{margin-top:auto;background:var(--card);border-radius:24px 24px 0 0;padding:10px 20px calc(env(safe-area-inset-bottom) + 18px);box-shadow:0 -8px 30px rgba(31,59,58,.08)}
.grip{width:38px;height:5px;border-radius:3px;background:#d5ddd8;margin:0 auto 12px}
.sheet h2{display:flex;justify-content:space-between;font:700 15px Manrope;margin-bottom:6px}
.sheet h2 span{color:var(--soft);font-weight:500}
ol{list-style:none}
ol li{display:grid;grid-template-columns:28px 1fr 1fr;padding:4px 0;font-size:15px;border-bottom:1px solid #edf1ec}
ol li .n{color:var(--soft)}
ol li.step{display:block;padding:4px 0 6px 28px;font-size:13px;color:#a2620e;border-bottom:1px solid #edf1ec}
.actions{display:flex;gap:10px;margin-top:14px}
.actions button{flex:1;height:50px;border-radius:16px;border:0;font:700 15px Manrope;background:var(--bg);color:var(--ink)}
.actions button.primary{background:var(--ink);color:var(--card)}
@media (max-height:800px){
  .hero .num{font-size:84px}
  .hero p{font-size:20px}
  .hero p span{display:none}
  ol li:nth-child(-n+3){display:none}
}
</style></head>
<body><main class="app">
  <div class="top"><span>vs Snailfish · Medium</span><button>Menu</button></div>
  <section class="hero">
    <div class="num">${STATUS.movesUntilSnails}</div>
    <p>move until the snails move<span>After Black's next move, the snails step onto the amber squares.</span></p>
  </section>
  <div class="cardwrap">${board()}</div>
  <div class="who">
    <span><b>Their king</b> · ${STATUS.theirKingDistance} squares from danger</span>
    <span class="me"><b>Yours</b> · <em>${STATUS.yourKingDistance} squares</em></span>
  </div>
  <section class="sheet">
    <div class="grip"></div>
    <h2>Moves <span>Your move</span></h2>
    <ol>${moveRows()}</ol>
    <div class="actions"><button>Undo</button><button class="primary">New game</button></div>
  </section>
</main></body></html>`;
}
