// Board surface options. Everything else (layout, blue = legal, coral = snail) stays as round 05.
// Each entry overrides only the square colours; legal and snail squares get a slightly deeper
// tone on dark squares so the checkerboard still reads through the highlight.
const flat = ({ light, dark, legalL = '#2e9bff', legalD = '#1f86e6', nextL = '#ff5a4e', nextD = '#e9483d', extra = '' }) => `
.sq{background:${light}}
.sq.d{background:${dark}}
.sq.snail-next{background:${nextL}}
.sq.snail-next.d{background:${nextD}}
.sq.legal,.sq.sel{background:${legalL}}
.sq.legal.d,.sq.sel.d{background:${legalD}}
.sq.d .pc,.sq.legal .pc,.sq.d .board-snail{filter:none}
${extra}`;

export const BOARDS = [
  {
    id: 'hatch', name: 'Current: hatched', note: 'Round 05 as-is, for comparison.',
    palette: ['#ffffff', '#111111', '#2e9bff', '#ff5a4e'], css: '',
  },
  {
    id: 'whisper', name: 'Whisper hatch', note: 'Keeps the Really Bad Chess hatch, but finer, wider-spaced and at 18% ink so it reads as texture, not stripes.',
    palette: ['#ffffff', '#d9d9d9', '#2e9bff', '#ff5a4e'],
    css: `:root{--hatch:repeating-linear-gradient(135deg,rgba(17,17,17,.18) 0 1px,transparent 1px 9px)}
.sq.d .pc,.sq.legal .pc,.sq.d .board-snail{filter:none}`,
  },
  {
    id: 'paper-grey', name: 'Paper grey', note: 'Flat white and a soft neutral grey. The quietest option; snails and moves do all the talking.',
    palette: ['#ffffff', '#e3e3e3', '#2e9bff', '#ff5a4e'],
    css: flat({ light: '#ffffff', dark: '#e3e3e3' }),
  },
  {
    id: 'dots', name: 'Dot grid', note: 'Dark squares carry a sparse dot pattern instead of lines: still printed-paper texture, far less movement.',
    palette: ['#ffffff', '#ececec', '#2e9bff', '#ff5a4e'],
    css: flat({ light: '#ffffff', dark: 'radial-gradient(circle,rgba(17,17,17,.28) 1.1px,transparent 1.4px) 0 0/8px 8px,#f1f1f1', legalD: 'radial-gradient(circle,rgba(17,17,17,.35) 1.1px,transparent 1.4px) 0 0/8px 8px,#2e9bff', nextD: 'radial-gradient(circle,rgba(17,17,17,.3) 1.1px,transparent 1.4px) 0 0/8px 8px,#ff5a4e' }),
  },
  {
    id: 'stone', name: 'Warm stone', note: 'Cream and pebble: warmer, still neutral enough that coral and blue pop.',
    palette: ['#f7f4ee', '#d8d1c4', '#2e9bff', '#ff5a4e'],
    css: flat({ light: '#f7f4ee', dark: '#d8d1c4' }),
  },
  {
    id: 'slate', name: 'Cool slate', note: 'Blue-grey board; legal moves switch to a brighter cyan-blue so they still stand apart.',
    palette: ['#eef1f5', '#c5cdd8', '#1fa3ff', '#ff5a4e'],
    css: flat({ light: '#eef1f5', dark: '#c5cdd8', legalL: '#1fa3ff', legalD: '#0f8ee8' }),
  },
  {
    id: 'sage', name: 'Sage', note: 'A muted green board in the chess.com spirit, desaturated so it never fights the coral.',
    palette: ['#f1f4ec', '#b8c7ae', '#2e9bff', '#ff5a4e'],
    css: flat({ light: '#f1f4ec', dark: '#b8c7ae' }),
  },
  {
    id: 'ink', name: 'Ink outline', note: 'All squares white; dark squares are marked by a thin inner frame only. Maximum calm, most Gage-like.',
    palette: ['#ffffff', '#111111', '#2e9bff', '#ff5a4e'],
    css: flat({ light: '#ffffff', dark: '#ffffff', extra: `.sq.d::before{content:"";position:absolute;inset:4px;border:1.5px solid rgba(17,17,17,.22);border-radius:3px}
.sq.legal.d::before,.sq.snail-next.d::before,.sq.sel.d::before{border-color:rgba(255,255,255,.55)}` }),
  },
];
