// Direction 2 — Field Notes: a naturalist's notebook. The snails are specimens under study;
// the board is an ink plate on the left page, the game is an observation log on the right.
import { cells, LOG, SNAILS, STATUS } from './scene.mjs';

const SQ = 58;
const at = (sq) => ({ x: (sq.charCodeAt(0) - 97) * SQ, y: (8 - Number(sq[1])) * SQ });
const outline = (g) => String.fromCodePoint(g.codePointAt(0) - 6) + '︎';

// Pen-and-ink snail, drawn once, reused; `hatched` shades the shell for the Black specimen.
const snailSvg = (hatched) => `<svg viewBox="0 0 64 64" class="specimen" aria-hidden="true">
  <path d="M6 50 C 14 46, 22 47, 30 48 L 54 48 C 58 48, 60 46, 59 43 C 58 40, 54 40, 52 38 L 50 28" class="ink"/>
  <path d="M50 28 L 47 16 M 52 30 L 56 19" class="ink thin"/>
  <circle cx="47" cy="15" r="1.8" class="dot"/><circle cx="56.5" cy="18" r="1.8" class="dot"/>
  ${hatched ? '<defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#efe4cc"/><path d="M0 0V4" stroke="#3b2a1a" stroke-width="1.4"/></pattern></defs>' : ''}
  <circle cx="30" cy="33" r="15" class="shell" ${hatched ? 'fill="url(#hatch)"' : ''}/>
  <path d="M30 33 m0 -3 a3 3 0 1 1 -3 3 a6 6 0 0 1 6 -6 a9 9 0 0 1 9 9 a12 12 0 0 1 -12 12" class="ink thin"/>
</svg>`;

function plate() {
  const squares = cells().map((c) => {
    let piece = '';
    if (c.piece) piece = `<span class="pc">${c.piece.color === 'w' ? outline(c.piece.glyph) : c.piece.glyph}</span>`;
    if (c.snail) piece = snailSvg(c.snail === 'b');
    return `<div class="sq ${c.light ? 'l' : 'd'}">${piece}</div>`;
  }).join('');
  const ring = (sq, rot) => { const p = at(sq); return `<ellipse cx="${p.x + SQ / 2}" cy="${p.y + SQ / 2}" rx="27" ry="23" transform="rotate(${rot} ${p.x + SQ / 2} ${p.y + SQ / 2})" class="red"/>`; };
  const arrow = (from, to) => { const a = at(from), b = at(to); return `<path d="M${a.x + SQ / 2} ${a.y + SQ / 2} Q ${(a.x + b.x) / 2 + SQ / 2 + 14} ${(a.y + b.y) / 2 + SQ / 2 - 14}, ${b.x + SQ / 2 - 8} ${b.y + SQ / 2 + 8}" class="red arrow" marker-end="url(#tip)"/>`; };
  return `<div class="plate">
    <div class="grid">${squares}</div>
    <svg class="marks" viewBox="0 0 ${SQ * 8} ${SQ * 8}" aria-hidden="true">
      <defs><marker id="tip" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 L9 5 L0 9" fill="none" stroke="#b5432b" stroke-width="1.6"/></marker></defs>
      ${ring(SNAILS.w.next, -8)}${ring(SNAILS.b.next, 6)}
      ${arrow(SNAILS.w.square, SNAILS.w.next)}${arrow(SNAILS.b.square, SNAILS.b.next)}
    </svg>
    <div class="coords files">${'abcdefgh'.split('').map((f) => `<span>${f}</span>`).join('')}</div>
    <div class="coords ranks">${[8, 7, 6, 5, 4, 3, 2, 1].map((r) => `<span>${r}</span>`).join('')}</div>
  </div>`;
}

function log() {
  return LOG.map((m) => {
    const obs = m.snails
      ? `<p class="obs">${m.snails.map((s) => `${s.who}'s specimen crept ${s.from}→${s.to}${s.crushed ? `, crushing ${s.crushed}` : ''}`).join('; ')}.</p>`
      : '';
    return `<li><span class="n">${m.n}</span><span class="mv">${m.w}</span><span class="mv">${m.b}</span>${obs}</li>`;
  }).join('') + `<li class="now"><span class="n">9</span><span class="mv">…</span></li>`;
}

export default function render() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Immortal Snail Chess — Field Notes</title>
<style>
@font-face{font-family:Garamond;font-weight:400;src:url(fonts/eb-garamond-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:Garamond;font-weight:400;font-style:italic;src:url(fonts/eb-garamond-latin-400-italic.woff2) format('woff2')}
@font-face{font-family:Garamond;font-weight:600;src:url(fonts/eb-garamond-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:Garamond;font-weight:700;src:url(fonts/eb-garamond-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:Plex;font-weight:400;src:url(fonts/ibm-plex-mono-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:Plex;font-weight:500;src:url(fonts/ibm-plex-mono-latin-500-normal.woff2) format('woff2')}
:root{--paper:#efe4cc;--paper-2:#e6d8b9;--ink:#3b2a1a;--ink-2:#5a4632;--red:#b5432b;--pencil:#8a8070;--line:rgba(59,42,26,.14)}
*{box-sizing:border-box;margin:0}
body{height:100vh;overflow:hidden;background:#cbb994 radial-gradient(ellipse at 50% 40%,#d8c7a2,#b5a27b 85%);
  font:400 18px/1.55 Garamond,Georgia,serif;color:var(--ink);display:grid;place-items:center}
.book{width:1340px;height:850px;display:grid;grid-template-columns:56% 44%;border-radius:6px;
  background:linear-gradient(90deg,var(--paper) 0 55.4%,#cdbb96 55.6%,#d9c8a5 56%,var(--paper) 56.6%);
  box-shadow:0 30px 70px rgba(52,36,18,.45),0 0 0 1px rgba(59,42,26,.25)}
.page{position:relative;padding:44px 56px;background-image:repeating-linear-gradient(0deg,transparent 0 31px,var(--line) 31px 32px)}
.page.left{padding-right:40px}
.title{display:flex;justify-content:space-between;align-items:baseline}
h1{font:700 30px/1.1 Garamond,serif;letter-spacing:.01em}
h1 i{font-weight:400}
.turn{font:italic 400 22px Garamond;color:var(--red);transform:rotate(-3deg)}
.plate{position:relative;width:${SQ * 8}px;height:${SQ * 8}px;margin:40px 0 0 26px}
.grid{display:grid;grid-template-columns:repeat(8,${SQ}px);border:2px solid var(--ink);outline:1px solid var(--ink);outline-offset:4px;background:var(--paper)}
.sq{height:${SQ}px;display:grid;place-items:center;border:.5px solid rgba(59,42,26,.35)}
.sq.d{background:repeating-linear-gradient(45deg,rgba(59,42,26,.32) 0 1px,transparent 1px 6px)}
.pc{font:40px/1 "DejaVu Sans","Segoe UI Symbol","Apple Symbols",serif;color:var(--ink);text-shadow:0 0 6px var(--paper),0 0 2px var(--paper)}
.specimen{width:52px;height:52px;filter:drop-shadow(0 0 3px var(--paper))}
.ink{fill:none;stroke:var(--ink);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.ink.thin{stroke-width:1.6}
.dot{fill:var(--ink)}
.shell{stroke:var(--ink);stroke-width:2.4}
.shell:not([fill]){fill:var(--paper)}
.marks{position:absolute;inset:0;width:${SQ * 8}px;height:${SQ * 8}px;overflow:visible;pointer-events:none}
.red{fill:none;stroke:var(--red);stroke-width:2.2;stroke-linecap:round}
.arrow{stroke-dasharray:5 4}
.coords{position:absolute;font:500 12px Plex,monospace;color:var(--pencil)}
.files{left:0;right:0;bottom:-30px;display:grid;grid-template-columns:repeat(8,${SQ}px);justify-items:center}
.ranks{top:0;bottom:0;left:-26px;display:grid;grid-template-rows:repeat(8,${SQ}px);align-items:center}
.note{position:absolute;width:132px;font:italic 400 16px/1.35 Garamond;color:var(--ink-2)}
.note b{font-style:normal;font-weight:600;color:var(--ink)}
.note .latin{display:block;font:500 12px/1.4 Plex,monospace;font-style:normal;color:var(--red);margin-bottom:2px}
.note.n1{top:178px;left:${56 + 26 + SQ * 8 + 34}px}
.note.n2{top:470px;left:${56 + 26 + SQ * 8 + 34}px}
.note.n1::before,.note.n2::before{content:"";position:absolute;left:-28px;top:10px;width:22px;border-top:1.5px solid var(--red)}
.foot{margin:62px 0 0 26px;display:flex;gap:26px;font:400 18px Garamond}
.foot a{color:var(--ink);text-decoration:underline;text-decoration-color:rgba(59,42,26,.4);text-underline-offset:4px}

.page.right{padding-left:52px;padding-right:48px}
.right h2{font:600 30px/1.1 Garamond;margin-bottom:4px}
.meta{font:400 13px/1.5 Plex,monospace;color:var(--pencil)}
.forecast{margin:26px 0 18px;padding:16px 20px;border:1.5px solid var(--ink);border-radius:2px;position:relative;background:rgba(239,228,204,.7);transform:rotate(-.6deg)}
.forecast::after{content:"";position:absolute;top:-9px;left:28px;width:14px;height:14px;border-radius:50%;border:1.5px solid var(--ink);background:var(--paper)}
.forecast p{font:italic 400 24px/1.25 Garamond}
.forecast p b{font-style:normal;font-weight:700;color:var(--red)}
.tally{display:flex;gap:10px;margin-top:10px;font:500 13px Plex,monospace;color:var(--ink-2);align-items:center}
.tally span{display:inline-block;width:3px;height:22px;background:var(--ink);transform:rotate(8deg)}
.tally span.left{background:none;border-left:3px dotted var(--ink-2)}
.dists{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px;font-size:17px}
.dists b{font:700 34px/1 Garamond;display:block;color:var(--red)}
ol{list-style:none;padding:0}
ol li{display:grid;grid-template-columns:30px 76px 76px 1fr;align-items:baseline;line-height:31px}
.n{font:500 13px Plex,monospace;color:var(--pencil)}
.mv{font:600 19px Garamond}
.obs{grid-column:1/-1;font:italic 400 16px/1.4 Garamond;color:var(--red);margin:-2px 0 6px 30px}
.now .mv{color:var(--red)}
</style></head>
<body><div class="book">
  <section class="page left">
    <div class="title"><h1>Immortal Snail Chess <i>— field notes</i></h1><span class="turn">${STATUS.turn}.</span></div>
    ${plate()}
    <p class="note n1"><span class="latin">Helix immortalis (W)</span>Next step <b>d7</b>, onto ${SNAILS.w.threat.replace("Black's ", 'the ').replace(' on d7', '')}.</p>
    <p class="note n2"><span class="latin">Helix immortalis (B)</span>Next step <b>e2</b>, beside your king.</p>
    <nav class="foot"><a>Take back</a><a>New game</a><a>Settings</a></nav>
  </section>
  <section class="page right">
    <h2>Observation log</h2>
    <p class="meta">You (White) vs ${STATUS.opponent}</p>
    <div class="forecast"><p>The snails move after <b>Black's next move</b>.</p>
      <div class="tally"><span></span><span></span><span class="left"></span> two moves gone, one to go</div></div>
    <div class="dists">
      <p><b>${STATUS.yourKingDistance} sq.</b>Black's specimen to your king</p>
      <p><b>${STATUS.theirKingDistance} sq.</b>Your specimen to their king</p>
    </div>
    <ol>${log()}</ol>
  </section>
</div></body></html>`;
}
