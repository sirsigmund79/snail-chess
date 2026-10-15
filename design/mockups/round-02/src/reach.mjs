// Direction C — Reach: the board runs edge to edge; each snail's danger zone is a soft tint on
// the squares around it, so the threat reads from the board itself. Two quiet cards below say the
// same thing in words; a tab bar keeps everything in thumb reach.
import { cells, LOG, SNAILS, STATUS } from '../../round-01/src/scene.mjs';
import { piece } from './pieces.mjs';

const near = (a, b) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1]))) === 1;

const snail = (side) => `<svg class="snail s-${side}" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M3 35 Q 20 29 35 33 Q 39 34 38 30 L 35 15" class="body"/>
  <path d="M35 15 l-2 -5 M35 15 l3 -4" class="horn"/>
  <circle cx="18" cy="20" r="14" class="shell"/>
  <path d="M18 20 m-2.5 0 a2.5 2.5 0 1 1 2.5 2.5 a5.5 5.5 0 0 1 -5.5 -5.5 a8.5 8.5 0 0 1 8.5 -8.5" class="spiral"/>
</svg>`;

function board() {
  return cells().map((c) => {
    const zone = ['w', 'b'].find((s) => near(c.sq, SNAILS[s].square));
    const cls = ['sq', c.light ? 'l' : 'd', zone ? `z z-${zone}` : '', c.target ? 'next' : ''].join(' ');
    const inner = c.snail ? snail(c.snail) : c.piece ? piece(c.piece.color, c.piece.type) : '';
    return `<div class="${cls}">${inner}</div>`;
  }).join('');
}

const mini = (dist, tone) => `<span class="mini ${tone}">${[1, 2, 3].map((i) => `<i class="${i <= 3 - dist ? 'on' : ''}"></i>`).join('')}</span>`;

export default function render() {
  const last = LOG[LOG.length - 1];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Immortal Snail Chess — Reach</title>
<style>
@font-face{font-family:Figtree;font-weight:400;src:url(fonts/figtree-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:Figtree;font-weight:500;src:url(fonts/figtree-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:Figtree;font-weight:700;src:url(fonts/figtree-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:Figtree;font-weight:800;src:url(fonts/figtree-latin-800-normal.woff2) format('woff2')}
:root{--bg:#f0eef6;--ink:#2f2648;--soft:#7f7896;--light:#ecebf1;--dark:#d5d2de;--violet:#6e4fe0;--zone-w:rgba(110,79,224,.18);--zone-b:rgba(222,92,124,.2);--rose:#d6466b;--card:#fbfaff}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--bg);color:var(--ink);font:500 15px/1.45 Figtree,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.app{min-height:100%;max-width:430px;margin:0 auto;display:flex;flex-direction:column;padding-top:calc(env(safe-area-inset-top) + 8px)}

.head{display:flex;align-items:baseline;justify-content:space-between;padding:12px 18px 14px}
.head h1{font:800 21px/1.2 Figtree;letter-spacing:-.01em}
.head h1 span{color:var(--soft);font-weight:500}
.pill{display:inline-flex;align-items:center;gap:8px;font:700 13px Figtree;color:var(--violet);background:#fff;border-radius:999px;padding:6px 10px 6px 8px;box-shadow:0 1px 3px rgba(47,38,72,.08)}
.pill i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e3def3}
.pill i.on{background:var(--violet)}
.pill i.next{background:var(--violet);box-shadow:0 0 0 3px rgba(110,79,224,.25)}

.board{display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1}
.sq{position:relative;display:grid;place-items:center}
.sq.l{background:var(--light)}
.sq.d{background:var(--dark)}
.sq.z-w{box-shadow:inset 0 0 0 999px var(--zone-w)}
.sq.z-b{box-shadow:inset 0 0 0 999px var(--zone-b)}
.sq.next::after{content:"";position:absolute;inset:3px;border-radius:6px;border:2px solid currentColor;opacity:.9}
.sq.next.z-w{color:var(--violet)}
.sq.next.z-b{color:var(--rose)}
.pc{width:86%;height:86%;position:relative;z-index:1}
.snail{width:100%;height:100%}
.horn{stroke:var(--ink);stroke-width:1.8;stroke-linecap:round}
.body{fill:#f6eedc;stroke:var(--ink);stroke-width:1.8;stroke-linejoin:round}
.shell{stroke:var(--ink);stroke-width:1.8}
.s-w .shell{fill:#fff}
.s-b .shell{fill:var(--ink)}
.spiral{fill:none;stroke-width:1.6;stroke-linecap:round}
.s-w .spiral{stroke:var(--violet)}
.s-b .spiral{stroke:#f3a2b6}

.cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 14px 0}
.card{background:var(--card);border-radius:16px;padding:12px 14px;box-shadow:0 1px 3px rgba(47,38,72,.06)}
.card b{display:block;font:800 26px/1.1 Figtree;letter-spacing:-.02em}
.card p{font-size:13px;color:var(--soft);margin-top:2px}
.card.danger b{color:var(--rose)}
.card.chance b{color:var(--violet)}
.mini{display:flex;gap:3px;margin-top:8px}
.mini i{flex:1;height:4px;border-radius:2px;background:#ebe7f5}
.danger .mini i.on{background:var(--rose)}
.chance .mini i.on{background:var(--violet)}

.last{display:flex;justify-content:space-between;align-items:center;margin:12px 14px 0;padding:12px 14px;border-radius:16px;background:var(--card);font-size:14px}
.last span{color:var(--soft)}
.last b{font-weight:700}
.turn{flex:none;white-space:nowrap;font:700 14px Figtree;color:#fff;background:var(--ink);border-radius:999px;padding:6px 12px}

.tabs{margin-top:auto;display:grid;grid-template-columns:repeat(4,1fr);padding:10px 8px calc(env(safe-area-inset-bottom) + 10px);background:var(--card);border-top:1px solid #e6e2f1}
.tabs a{display:grid;justify-items:center;gap:3px;font:500 12px Figtree;color:var(--soft);text-decoration:none}
.tabs a.on{color:var(--ink)}
.tabs svg{width:24px;height:24px}
</style></head>
<body><main class="app">
  <header class="head">
    <h1>Snailfish <span>· Medium</span></h1>
    <span class="pill"><i class="on"></i><i class="on"></i><i class="next"></i>Snails next</span>
  </header>
  <div class="board">${board()}</div>
  <section class="cards">
    <div class="card danger"><b>${STATUS.yourKingDistance} squares</b><p>between your king and Black's snail</p>${mini(STATUS.yourKingDistance, 'r')}</div>
    <div class="card chance"><b>${STATUS.theirKingDistance} squares</b><p>between your snail and their king</p>${mini(STATUS.theirKingDistance, 'v')}</div>
  </section>
  <div class="last"><span>Last move <b>${last.n}… ${last.b}</b></span><span class="turn">Your move</span></div>
  <nav class="tabs">
    <a class="on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 12h16M12 4v16"/></svg>Board</a>
    <a><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg>Moves</a>
    <a><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>Undo</a>
    <a><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></svg>New</a>
  </nav>
</main></body></html>`;
}
