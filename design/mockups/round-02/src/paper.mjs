// Direction A — Paper: warm off-white, flat board, one coral accent used only for snail danger.
// Classic stack (opponent / board / you) so it feels familiar; the snail info lives next to the
// player it threatens, and the countdown is three dots under the board.
import { cells, LOG, SNAILS, STATUS } from '../../round-01/src/scene.mjs';
import { piece } from './pieces.mjs';

const snail = (side) => `<svg class="snail s-${side}" viewBox="0 0 40 40" aria-hidden="true">
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

const lastMoves = () => {
  const recent = LOG.slice(-3);
  return recent.map((m) => `<span><b>${m.n}.</b> ${m.w} ${m.b}</span>`).join('') + '<span class="you"><b>9.</b> …</span>';
};

export default function render() {
  const done = 3 - STATUS.movesUntilSnails;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Immortal Snail Chess — Paper</title>
<style>
@font-face{font-family:DM;font-weight:400;src:url(fonts/dm-sans-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:DM;font-weight:500;src:url(fonts/dm-sans-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:DM;font-weight:700;src:url(fonts/dm-sans-latin-700-normal.woff2) format('woff2')}
:root{--bg:#f5f2ea;--ink:#2b2a27;--soft:#8c877c;--line:#e4dfd3;--light:#ebe5d8;--dark:#d4cab5;--coral:#e4573d;--coral-bg:rgba(228,87,61,.16)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--bg);color:var(--ink);font:400 15px/1.45 DM,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.app{min-height:100%;max-width:430px;margin:0 auto;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 14px) 0 calc(env(safe-area-inset-bottom) + 14px)}

.player{display:flex;align-items:center;gap:12px;padding:14px 20px}
.avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font:700 14px DM;flex:none}
.them .avatar{background:var(--ink);color:var(--bg)}
.you .avatar{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.who{flex:1;min-width:0}
.who b{display:block;font-weight:700;font-size:16px}
.who span{display:block;color:var(--soft);font-size:13px}
.who span.warn{color:var(--coral)}
.badge{font:500 13px DM;padding:6px 12px;border-radius:999px;background:var(--ink);color:var(--bg)}
.menu{border:0;background:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--soft)}
.menu svg{width:22px;height:22px}

.board{display:grid;grid-template-columns:repeat(8,1fr);margin:0 12px;border-radius:8px;overflow:hidden;aspect-ratio:1}
.sq{position:relative;display:grid;place-items:center}
.sq.l{background:var(--light)}
.sq.d{background:var(--dark)}
.sq.next{background:var(--coral-bg)}
.sq.next.d{background:color-mix(in srgb,var(--dark),var(--coral) 22%)}
.sq.next::after{content:"";width:28%;aspect-ratio:1;border-radius:50%;background:var(--coral);position:absolute}
.sq.next .pc{position:relative;z-index:1}
.pc{width:88%;height:88%}
.snail{width:86%;height:86%}
.foot{fill:#efe9dc;stroke:var(--ink);stroke-width:1.6}
.horn{stroke:var(--ink);stroke-width:1.6;stroke-linecap:round}
.shell{stroke:var(--ink);stroke-width:1.6}
.s-w .shell{fill:#fff}
.s-b .shell{fill:var(--ink)}
.spiral{fill:none;stroke-width:1.5;stroke-linecap:round}
.s-w .spiral{stroke:var(--ink)}
.s-b .spiral{stroke:var(--bg)}
.sq i{position:absolute;font:500 9px DM;font-style:normal;color:rgba(43,42,39,.45)}
.sq i.r{top:2px;left:3px}
.sq i.f{bottom:1px;right:3px}

.clock{display:flex;align-items:center;gap:12px;padding:18px 20px 4px}
.dots{display:flex;gap:6px}
.dots span{width:10px;height:10px;border-radius:50%;background:var(--line)}
.dots span.on{background:var(--ink)}
.dots span.next{background:var(--coral)}
.clock p{font-size:15px}
.clock p b{font-weight:700}

.spacer{flex:1}
.moves{display:flex;gap:14px;padding:6px 20px 12px;color:var(--soft);font-size:14px;white-space:nowrap;overflow:hidden}
.moves b{font-weight:500;color:var(--soft)}
.moves span{color:var(--ink)}
.moves .you{color:var(--coral);font-weight:700}
.bar{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px}
.bar button{height:52px;border:0;border-radius:14px;background:#ebe6da;color:var(--ink);font:500 15px DM;display:flex;align-items:center;justify-content:center;gap:8px}
.bar svg{width:18px;height:18px}
</style></head>
<body><main class="app">
  <section class="player them">
    <div class="avatar">S</div>
    <div class="who"><b>Snailfish</b><span>Medium · ${STATUS.theirKingDistance} squares from your snail</span></div>
    <button class="menu" aria-label="Menu"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
  </section>
  <div class="board">${board()}</div>
  <section class="clock">
    <div class="dots">${[0, 1, 2].map((i) => `<span class="${i < done ? 'on' : i === done ? 'next' : ''}"></span>`).join('')}</div>
    <p>Snails move after <b>Black's next move</b>.</p>
  </section>
  <section class="player you">
    <div class="avatar">You</div>
    <div class="who"><b>You</b><span class="warn">${STATUS.yourKingDistance} squares from Black's snail</span></div>
    <span class="badge">Your move</span>
  </section>
  <div class="spacer"></div>
  <div class="moves">${lastMoves()}</div>
  <nav class="bar">
    <button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>Undo</button>
    <button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>Moves</button>
    <button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New</button>
  </nav>
</main></body></html>`;
}
