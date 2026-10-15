// Colour + type combinations for the same layout. Each has one accent that only means
// "snail": the next squares, the countdown and your king's distance.
const dm = [['DM Sans', 400, 'dm-sans-latin-400-normal.woff2'], ['DM Sans', 500, 'dm-sans-latin-500-normal.woff2'], ['DM Sans', 700, 'dm-sans-latin-700-normal.woff2']];
const manrope = [['Manrope', 400, 'manrope-latin-400-normal.woff2'], ['Manrope', 500, 'manrope-latin-500-normal.woff2'], ['Manrope', 700, 'manrope-latin-700-normal.woff2']];
const figtree = [['Figtree', 400, 'figtree-latin-400-normal.woff2'], ['Figtree', 500, 'figtree-latin-500-normal.woff2'], ['Figtree', 700, 'figtree-latin-700-normal.woff2']];
const inter = [['Inter', 400, 'inter-latin-400-normal.woff2'], ['Inter', 600, 'inter-latin-600-normal.woff2'], ['Inter', 700, 'inter-latin-700-normal.woff2']];
const plex = [['Plex Mono', 400, 'ibm-plex-mono-latin-400-normal.woff2'], ['Plex Mono', 500, 'ibm-plex-mono-latin-500-normal.woff2']];
const garamond = [['EB Garamond', 400, 'eb-garamond-latin-400-normal.woff2'], ['EB Garamond', 700, 'eb-garamond-latin-600-normal.woff2']];

export const THEMES = [
  {
    id: 'paper', name: 'Paper', ui: 'DM Sans', fonts: dm,
    blurb: 'Warm off-white, sand board, coral snails.',
    c: { bg: '#f5f2ea', ink: '#2b2a27', soft: '#8c877c', line: '#e1dbcd', light: '#ebe5d8', dark: '#d4cab5', accent: '#e4573d', btn: '#ebe6da', avatarBg: '#2b2a27', avatarInk: '#f5f2ea', coord: 'rgba(43,42,39,.45)', snailW: '#ffffff', snailB: '#2b2a27', foot: '#efe9dc' },
  },
  {
    id: 'mint', name: 'Mint & Graphite', ui: 'Manrope', fonts: manrope,
    blurb: 'Cool white and graphite, a fresh green for the snails.',
    c: { bg: '#f4f6f4', ink: '#22282a', soft: '#7d8786', line: '#dde3e0', light: '#e8edea', dark: '#c3cec9', accent: '#14a37f', btn: '#e6ebe8', avatarBg: '#22282a', avatarInk: '#f4f6f4', coord: 'rgba(34,40,42,.42)', snailW: '#ffffff', snailB: '#22282a', foot: '#e6ebe8' },
  },
  {
    id: 'sorbet', name: 'Sorbet', ui: 'Figtree', fonts: figtree,
    blurb: 'Peach paper, apricot board, raspberry snails.',
    c: { bg: '#fcf3ec', ink: '#3a2a2a', soft: '#9b8580', line: '#f0dccd', light: '#f6e4d6', dark: '#e8c4a8', accent: '#c8325a', btn: '#f5e6da', avatarBg: '#3a2a2a', avatarInk: '#fcf3ec', coord: 'rgba(58,42,42,.42)', snailW: '#ffffff', snailB: '#3a2a2a', foot: '#f6e4d6' },
  },
  {
    id: 'newsprint', name: 'Newsprint', ui: 'Inter', mono: 'Plex Mono', fonts: [...inter, ...plex],
    blurb: 'Grey newsprint and black ink, one signal blue. Move numbers in mono.',
    c: { bg: '#eeeeea', ink: '#141414', soft: '#77776f', line: '#d8d8d1', light: '#e2e2dc', dark: '#bdbdb4', accent: '#2f5bea', btn: '#e2e2dc', avatarBg: '#141414', avatarInk: '#eeeeea', coord: 'rgba(20,20,20,.42)', snailW: '#ffffff', snailB: '#141414', foot: '#e2e2dc' },
  },
  {
    id: 'parlour', name: 'Parlour', ui: 'Inter', display: 'EB Garamond', fonts: [...inter, ...garamond],
    blurb: 'Cream and olive like an old club board, burnt-orange snails, a serif for names.',
    c: { bg: '#f6f2e7', ink: '#2c2a22', soft: '#878170', line: '#e2dccb', light: '#ebe6d3', dark: '#a9b28c', accent: '#c4541f', btn: '#ebe6d6', avatarBg: '#56603f', avatarInk: '#f6f2e7', coord: 'rgba(44,42,34,.5)', snailW: '#ffffff', snailB: '#2c2a22', foot: '#ebe6d3' },
  },
  {
    id: 'night', name: 'Night Moss', ui: 'Figtree', fonts: figtree,
    blurb: 'Dark for evening play; stone board stays light so both piece colours read; lemon snails.',
    c: { bg: '#1d211e', ink: '#eef0e8', soft: '#9aa296', line: '#3a413b', light: '#cfd2c3', dark: '#9ba48f', accent: '#f2c94c', btn: '#2a302b', avatarBg: '#eef0e8', avatarInk: '#1d211e', coord: 'rgba(29,33,30,.55)', snailW: '#ffffff', snailB: '#2a302b', foot: '#cfd2c3', snailOutline: '#1d211e' },
  },
];
