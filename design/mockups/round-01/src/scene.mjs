// The one game moment every mockup shows (written once, shared by all three directions).
// Move 9, White (you) to move vs the Medium bot. 16 plies played; the snails move after Black's
// next move. Last snail step (after 6…Bd7) crushed White's knight on f3.

export const FEN = 'rn1qk2r/1ppbbp2/p2p1n1p/4p1p1/P1BPP3/2P4P/1P1N1PP1/R1BQK2R w KQkq - 0 9';

export const SNAILS = {
  w: { square: 'c6', next: 'd7', trail: ['a4', 'b5'], hunts: 'Black', threat: "Black's bishop on d7" },
  b: { square: 'f3', next: 'e2', trail: ['h5', 'g4'], hunts: 'White', threat: 'the square next to your king' },
};

export const STATUS = {
  turn: 'Your move',
  you: 'White',
  opponent: 'Snailfish bot · Medium',
  movesUntilSnails: 1,
  countdown: "Snails move after Black's next move",
  yourKingDistance: 2, // Black's snail f3 → your king e1
  theirKingDistance: 2, // your snail c6 → Black's king e8
};

// Move log, with the two snail steps so far as their own rows.
export const LOG = [
  { n: 1, w: 'e4', b: 'e5' },
  { n: 2, w: 'Nf3', b: 'Nf6' },
  { n: 3, w: 'Bc4', b: 'h6', snails: [
    { who: 'White', from: 'a4', to: 'b5' },
    { who: 'Black', from: 'h5', to: 'g4' },
  ] },
  { n: 4, w: 'd4', b: 'Be7' },
  { n: 5, w: 'c3', b: 'd6' },
  { n: 6, w: 'Nbd2', b: 'Bd7', snails: [
    { who: 'White', from: 'b5', to: 'c6' },
    { who: 'Black', from: 'g4', to: 'f3', crushed: "White's knight" },
  ] },
  { n: 7, w: 'h3', b: 'a6' },
  { n: 8, w: 'a4', b: 'g5' },
];

// ---- helpers (data only; each direction draws the board its own way) -----------------------
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
export const FILES = 'abcdefgh';

/** 64 cells from White's side, rank 8 first: { sq, light, piece: {color, type, glyph} | null, ... }. */
export function cells() {
  const rows = FEN.split(' ')[0].split('/');
  const out = [];
  rows.forEach((row, i) => {
    const rank = 8 - i;
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let k = 0; k < Number(ch); k++) out.push(cell(f++, rank, null));
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase();
        out.push(cell(f++, rank, { color, type, glyph: GLYPH[type] + '︎' }));
      }
    }
  });
  return out;
}

function cell(f, rank, piece) {
  const sq = FILES[f] + rank;
  const snail = Object.entries(SNAILS).find(([, s]) => s.square === sq)?.[0] ?? null;
  const target = Object.entries(SNAILS).find(([, s]) => s.next === sq)?.[0] ?? null;
  const trail = Object.entries(SNAILS).find(([, s]) => s.trail.includes(sq))?.[0] ?? null;
  return { sq, file: f, rank, light: (f + rank) % 2 === 1, piece, snail, target, trail };
}
