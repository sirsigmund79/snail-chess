// Hyperpop colorways for the round-05 layout. Rules kept from the real design: one colour only
// means "legal move", another only means "snail", and both must stand apart from the board.
// Board-local ink stays dark so pieces and snails keep their outlines on any background.
const theme = ({ bg, ink, soft, line, legal, snail, light, dark, rim, brand = null, extra = '', darkUi = false }) => `
:root{--ink:${ink};--soft:${soft};--line:${line};--blue:${legal};--coral:${snail}}
body{background:${bg}}
.board{--ink:#160016}
.sq{background:${light}}
.sq.d{background:${dark}}
.sq.snail-next{background:var(--coral)}
.sq.snail-next.d{background:color-mix(in srgb,var(--coral),#000 10%)}
.sq.legal,.sq.sel{background:var(--blue)}
.sq.legal.d,.sq.sel.d{background:color-mix(in srgb,var(--blue),#000 12%)}
.sq.d .pc,.sq.legal .pc,.sq.d .board-snail{filter:none}
.av{background:var(--ink);color:${bg.startsWith('#') ? bg : '#fff'}}
.pbar.you .av{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 2.5px var(--ink)}
.mv.now{background:var(--ink);color:${darkUi ? '#0b0b0f' : light}}
.mv.now b{color:${darkUi ? '#0b0b0f' : light}}
${darkUi ? `/* On dark backgrounds the UI snail icons are drawn as light outlines. */
.tiny .shell,.tiny .foot,.dot-snail:not(.moving) .shell,.dot-snail .foot,.brand-snail .shell,.brand-snail .foot{fill:transparent}
.dot-snail.moving .foot{fill:transparent}` : ''}
.toolbar{border-top-color:var(--line)}
${brand ? `.brand{background:${brand};-webkit-background-clip:text;background-clip:text;color:transparent}` : ''}
${extra}`;

export const COLORWAYS = [
  {
    id: 'bubblegum', name: 'Bubblegum Bass', note: 'Pink everything, a chrome rim, electric cyan moves and acid-lime snails.',
    palette: ['#ffd3ef', '#ff8fd2', '#00e1ff', '#b8ff1f', '#2a0033'],
    css: theme({ bg: '#ffd3ef', ink: '#2a0033', soft: '#b0549a', line: '#ffb3e4', legal: '#00e1ff', snail: '#b8ff1f', light: '#fff0fa', dark: '#ff8fd2',
      rim: 'linear-gradient(90deg,#c0c0d8,#ffffff,#a8b4ff,#ffffff,#c0c0d8)', brand: 'linear-gradient(90deg,#ff2fa8,#7a3cff)' }),
  },
  {
    id: 'acid', name: 'Acid Rave', note: 'Black room, highlighter-yellow and violet board, hot-pink moves, traffic-cone snails.',
    palette: ['#0b0b0f', '#e9ff3b', '#9b5cff', '#ff2bd6', '#ff6a00'],
    css: theme({ bg: '#0b0b0f', ink: '#f4f4f4', soft: '#8f8f9a', line: '#26262e', legal: '#ff2bd6', snail: '#ff6a00', light: '#e9ff3b', dark: '#9b5cff',
      rim: 'linear-gradient(90deg,#ff2bd6,#e9ff3b,#00f0ff)', brand: 'linear-gradient(90deg,#e9ff3b,#ff2bd6)', darkUi: true }),
  },
  {
    id: 'chrome', name: 'Y2K Chrome', note: 'Holographic background, silver board, violet moves, hot-pink snails.',
    palette: ['#f3e8ff', '#cfd6e8', '#7a5cff', '#ff2f8e', '#1d1b3a'],
    css: theme({ bg: 'linear-gradient(160deg,#ffd6f5 0%,#d6f4ff 35%,#e9dcff 65%,#fff3d6 100%)', ink: '#1d1b3a', soft: '#6f6a9e', line: 'rgba(29,27,58,.15)', legal: '#7a5cff', snail: '#ff2f8e', light: '#ffffff',
      dark: 'linear-gradient(135deg,#c9d1e6,#f1f4fb 45%,#b9c2da)', rim: 'linear-gradient(90deg,#ff9be6,#9be7ff,#c6a8ff,#fff09b,#ff9be6)', brand: 'linear-gradient(90deg,#7a5cff,#ff2f8e,#00b7ff)',
      extra: '.av{color:#fff}' }),
  },
  {
    id: 'candy', name: 'Glitter Candy', note: 'Lemonade background, tangerine squares with a little sparkle, sky-blue moves, cherry snails.',
    palette: ['#fff1a6', '#ffb347', '#00b8ff', '#ff1f62', '#3a1500'],
    css: theme({ bg: '#fff1a6', ink: '#3a1500', soft: '#a1661c', line: '#ffe07a', legal: '#00b8ff', snail: '#ff1f62', light: '#fffbe3',
      dark: 'radial-gradient(circle at 30% 30%,rgba(255,255,255,.9) 0 1px,transparent 1.6px) 0 0/11px 11px,radial-gradient(circle at 70% 70%,rgba(255,255,255,.7) 0 .8px,transparent 1.4px) 0 0/15px 15px,#ffb347',
      rim: 'linear-gradient(90deg,#ff1f62,#ffb347,#00b8ff,#ff1f62)', brand: 'linear-gradient(90deg,#ff1f62,#ff8a00)' }),
  },
  {
    id: 'nightcore', name: 'Nightcore', note: 'Deep purple night, lavender board, mint moves, neon-pink snails.',
    palette: ['#170a33', '#f1e6ff', '#b28bff', '#00ffd1', '#ff3fa4'],
    css: theme({ bg: '#170a33', ink: '#f6efff', soft: '#a38fd0', line: '#2e1b5c', legal: '#00ffd1', snail: '#ff3fa4', light: '#f1e6ff', dark: '#b28bff',
      rim: 'linear-gradient(90deg,#00ffd1,#ff3fa4,#b28bff,#00ffd1)', brand: 'linear-gradient(90deg,#00ffd1,#ff3fa4)',
      extra: 'body{background:radial-gradient(ellipse at 50% 0%,#3b1a7a,#170a33 60%)}', darkUi: true }),
  },
];
