# Design notes: hyperpop colorways, round 07 (just for fun)

The round-05 layout in five hyperpop colorways: saturated neons, bubblegum, acid, Y2K chrome and holographic gradients. Two readability rules hold in every one: a single colour means "legal move" and another means "snail", and both stand apart from the board. Pieces and on-board snails keep dark outlines on every background. On dark themes, the small UI snail icons switch to light outlines.

| Colorway | Background | Board | Legal moves | Snails |
|---|---|---|---|---|
| Bubblegum Bass | Pink #ffd3ef | Blush / hot pink, chrome rim | Electric cyan | Acid lime |
| Acid Rave | Near-black | Highlighter yellow / violet | Hot pink | Traffic-cone orange |
| Y2K Chrome | Holographic gradient | White / brushed silver | Violet | Hot pink |
| Glitter Candy | Lemonade | Cream / sparkly tangerine | Sky blue | Cherry |
| Nightcore | Deep purple glow | Lavender / violet | Mint | Neon pink |

Each has a `*-snails.html` state too, showing the move-dot snails flashing the theme's snail colour. Colorways live in `src/colorways.mjs`; rebuild with `npx tsx src/build.ts`.
