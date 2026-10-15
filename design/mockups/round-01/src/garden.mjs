// Direction 1 — Garden Patio: a wet stone patio after rain, when snails come out.
// Board is the whole stage; no sidebar. Countdown = a 3-chamber shell; move log = a ribbon.
import { cells, LOG, SNAILS, STATUS } from './scene.mjs';

const SQ = 74; // square size in px
const pos = (sq) => ({ x: (sq.charCodeAt(0) - 97) * SQ + SQ / 2, y: (8 - Number(sq[1])) * SQ + SQ / 2 });

function trailPath(color) {
  const s = SNAILS[color];
  const pts = [...s.trail, s.square].map(pos);
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
}

function board() {
  const squares = cells()
    .map((c) => {
      const cls = ['sq', c.light ? 'l' : 'd', c.target ? `t t-${c.target}` : ''].join(' ');
      const piece = c.piece ? `<span class="pc ${c.piece.color}">${c.piece.glyph}</span>` : '';
      const snail = c.snail ? `<span class="snail snail-${c.snail}"><span>🐌</span></span>` : '';
      return `<div class="${cls}">${piece}${snail}</div>`;
    })
    .join('');
  const files = 'abcdefgh'.split('').map((f) => `<span>${f}</span>`).join('');
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1].map((r) => `<span>${r}</span>`).join('');
  return `
  <div class="board-wrap">
    <div class="ranks">${ranks}</div>
    <div class="board">
      ${squares}
      <svg class="trails" viewBox="0 0 ${SQ * 8} ${SQ * 8}" aria-hidden="true">
        <defs>
          <linearGradient id="slime" x1="0" x2="1"><stop offset="0" stop-color="#e9f2c8" stop-opacity=".05"/><stop offset="1" stop-color="#e9f2c8" stop-opacity=".55"/></linearGradient>
        </defs>
        ${['w', 'b'].map((c) => `<path d="${trailPath(c)}" class="trail"/><path d="${trailPath(c)}" class="trail-shine"/>`).join('')}
      </svg>
    </div>
    <div class="files">${files}</div>
  </div>`;
}

function shell() {
  // Three chambers of a spiral shell; filled = moves already gone this cycle.
  const done = 3 - STATUS.movesUntilSnails;
  const chambers = [
    'M60 60 m-44 0 a44 44 0 0 1 88 0',
    'M104 60 a44 44 0 0 1 -44 44 a30 30 0 0 1 -30 -30',
    'M30 74 a30 30 0 0 1 30 -30 a16 16 0 0 1 16 16 a8 8 0 0 1 -8 8',
  ];
  return `<svg class="shell" viewBox="0 0 120 120" aria-hidden="true">
    ${chambers.map((d, i) => `<path d="${d}" class="ch ${i < done ? 'on' : ''} ${i === done ? 'next' : ''}"/>`).join('')}
  </svg>`;
}

function ribbon() {
  return LOG.map((m) => {
    const snail = (m.snails ?? [])
      .map((s) => `<li class="slug ${s.crushed ? 'crush' : ''}">🐌 ${s.who} ${s.from}→${s.to}${s.crushed ? ` · crushed ${s.crushed}` : ''}</li>`)
      .join('');
    return `<li><b>${m.n}.</b> ${m.w} <span>${m.b}</span></li>${snail}`;
  }).join('') + '<li class="now"><b>9.</b> your move…</li>';
}

export default function render() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Immortal Snail Chess — Garden Patio</title>
<style>
@font-face{font-family:Fraunces;font-weight:400;src:url(fonts/fraunces-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:Fraunces;font-weight:400;font-style:italic;src:url(fonts/fraunces-latin-400-italic.woff2) format('woff2')}
@font-face{font-family:Fraunces;font-weight:900;src:url(fonts/fraunces-latin-900-normal.woff2) format('woff2')}
@font-face{font-family:Inter;font-weight:400;src:url(fonts/inter-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:Inter;font-weight:600;src:url(fonts/inter-latin-600-normal.woff2) format('woff2')}
:root{
  --moss:#4f6b2a; --moss-2:#6f8f3a; --slate:#2f3b3a; --slate-2:#3b4a48; --night:#1d2625;
  --amber:#d58a3a; --amber-2:#f0b062; --cream:#f3ecd8; --stone:#cfc6ad; --stone-d:#7d8a6c;
  --text:#f3ecd8; --muted:#b9bfa8;
}
*{box-sizing:border-box;margin:0}
html,body{height:100%}
body{
  font:400 15px/1.5 Inter,system-ui,sans-serif;color:var(--text);
  background:
    radial-gradient(ellipse 60% 50% at 50% 45%, #3f4f45 0%, transparent 70%),
    radial-gradient(circle at 12% 88%, rgba(111,143,58,.35), transparent 30%),
    radial-gradient(circle at 92% 8%, rgba(111,143,58,.25), transparent 28%),
    repeating-linear-gradient(115deg, rgba(255,255,255,.015) 0 2px, transparent 2px 9px),
    var(--night);
  overflow:hidden;
}
.page{height:100vh;display:grid;grid-template-rows:auto 1fr auto;justify-items:center;padding:18px 40px 22px}
header{width:100%;display:flex;justify-content:space-between;align-items:center}
.mark{font:900 26px/1 Fraunces,serif;letter-spacing:-.01em}
.mark i{font-weight:400;color:var(--amber-2)}
.menu{display:flex;gap:8px}
.menu button{font:600 13px Inter,sans-serif;color:var(--cream);background:rgba(243,236,216,.08);border:1px solid rgba(243,236,216,.18);border-radius:999px;padding:8px 14px}

.stage{display:grid;grid-template-columns:200px auto 200px;align-items:center;gap:36px}
.player{display:grid;gap:6px}
.player.them{align-self:start;margin-top:22px}
.player.you{align-self:end;margin-bottom:34px;text-align:right}
.player .name{font:900 22px/1.1 Fraunces,serif}
.player .sub{color:var(--muted);font-size:13px}
.player .dist{margin-top:6px;font-size:14px;color:var(--cream)}
.player .dist b{color:var(--amber-2)}
.player .turn{display:inline-block;justify-self:end;margin-top:8px;font:600 13px Inter;background:var(--amber);color:#2a1a08;border-radius:999px;padding:5px 12px}

.board-wrap{display:grid;grid-template-columns:18px auto;grid-template-rows:auto 18px;gap:4px 6px}
.ranks{display:grid;grid-template-rows:repeat(8,${SQ}px);align-items:center;font:600 11px Inter;color:var(--muted)}
.files{grid-column:2;display:grid;grid-template-columns:repeat(8,${SQ}px);justify-items:center;font:600 11px Inter;color:var(--muted)}
.board{position:relative;display:grid;grid-template-columns:repeat(8,${SQ}px);grid-template-rows:repeat(8,${SQ}px);
  border-radius:10px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.45),0 0 0 6px #26312f,0 0 0 7px rgba(243,236,216,.12)}
.sq{position:relative;display:grid;place-items:center}
.sq.l{background:radial-gradient(circle at 30% 25%, #ddd5bd, #c6bd a2 70%);background:radial-gradient(circle at 30% 25%,#e2dac3,#c4bb9f 75%)}
.sq.d{background:radial-gradient(circle at 70% 70%,#61745a,#47573f 80%)}
.sq::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12),inset 0 2px 0 rgba(255,255,255,.12)}
.pc{position:relative;z-index:2;font:56px/1 "DejaVu Sans","Segoe UI Symbol","Apple Symbols",serif}
.pc.w{color:#fbf7ea;-webkit-text-stroke:1.4px #2a2f22;text-shadow:0 4px 0 rgba(0,0,0,.18)}
.pc.b{color:#1f2620;-webkit-text-stroke:1px #0a0d0a;text-shadow:0 4px 0 rgba(0,0,0,.2)}
.t::before{content:"";position:absolute;inset:6px;border-radius:50%;border:3px dashed var(--amber);z-index:1;box-shadow:0 0 18px rgba(240,176,98,.55)}
.t-w::before{border-color:#f3ecd8}
.snail{position:relative;z-index:3;display:grid;place-items:center;width:62px;height:62px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), rgba(255,255,255,.08) 60%);box-shadow:0 8px 16px rgba(0,0,0,.35)}
.snail span{font-size:44px;line-height:1}
.snail-w{outline:3px solid #f3ecd8;outline-offset:-3px}
.snail-b{outline:3px solid #1d2625;outline-offset:-3px}
.snail-w span{transform:scaleX(-1)}
.trails{position:absolute;inset:0;pointer-events:none;z-index:1}
.trail{fill:none;stroke:url(#slime);stroke-width:22;stroke-linecap:round;stroke-linejoin:round}
.trail-shine{fill:none;stroke:rgba(255,255,255,.45);stroke-width:3;stroke-linecap:round;stroke-dasharray:2 14}

.dock{width:min(1100px,100%);display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:center;
  background:rgba(29,38,37,.72);border:1px solid rgba(243,236,216,.12);border-radius:22px;padding:14px 22px}
.clock{display:flex;align-items:center;gap:14px}
.shell{width:74px;height:74px}
.ch{fill:none;stroke:rgba(243,236,216,.18);stroke-width:12;stroke-linecap:round}
.ch.on{stroke:var(--amber)}
.ch.next{stroke:var(--amber-2);stroke-dasharray:4 7}
.clock .big{font:900 24px/1.1 Fraunces,serif}
.clock .big i{font-weight:400;color:var(--amber-2)}
.clock .small{color:var(--muted);font-size:13px;margin-top:2px}
.ribbon{display:flex;justify-content:flex-end;gap:6px;align-items:center;list-style:none;padding:0;overflow:hidden;white-space:nowrap;
  mask-image:linear-gradient(90deg,transparent,#000 12%)}
.ribbon li{font-size:14px;padding:6px 10px;border-radius:10px;background:rgba(243,236,216,.06)}
.ribbon li b{color:var(--muted);font-weight:600;margin-right:2px}
.ribbon li span{color:var(--muted)}
.ribbon .slug{background:rgba(111,143,58,.28);color:#e2edc4;font-size:13px}
.ribbon .crush{background:rgba(213,138,58,.3);color:#ffe2bd}
.ribbon .now{background:var(--amber);color:#2a1a08;font-weight:600}
.ribbon .now b{color:#2a1a08}
</style></head>
<body><div class="page">
  <header>
    <div class="mark">Immortal <i>Snail</i> Chess</div>
    <nav class="menu"><button>Undo</button><button>New game</button><button>Settings</button></nav>
  </header>
  <section class="stage">
    <div class="player them">
      <div class="name">${STATUS.opponent.split(' · ')[0]}</div>
      <div class="sub">Black · ${STATUS.opponent.split(' · ')[1]}</div>
      <div class="dist">Your snail is <b>${STATUS.theirKingDistance} squares</b> from their king, about to crush ${SNAILS.w.threat}.</div>
    </div>
    ${board()}
    <div class="player you">
      <div class="name">You</div>
      <div class="sub">White</div>
      <div class="dist">Black's snail is <b>${STATUS.yourKingDistance} squares</b> from your king.</div>
      <span class="turn">${STATUS.turn}</span>
    </div>
  </section>
  <section class="dock">
    <div class="clock">${shell()}<div><div class="big">Snails move after <i>Black's next move</i></div><div class="small">The amber rings show where they land.</div></div></div>
    <ol class="ribbon">${ribbon()}</ol>
  </section>
</div></body></html>`;
}
