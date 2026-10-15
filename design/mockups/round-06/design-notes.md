# Design notes: board options, round 06

## Feedback
The black hatching on dark squares adds a lot of visual noise on top of tracking the snails. Asked for more design and colour options for the board.

## Approach
- **Unchanged:** the round-05 layout, blue = legal and coral = snail.
- **Varied:** only the square surfaces.
- **Test state:** every option is shown at the busiest moment: bishop on c4 selected (10 blue squares) with both snails and their coral next squares visible.
- **Highlights:** on flat boards, blue and coral are a shade deeper on dark squares, so the checkerboard still reads through a highlight.

| Option | Surface | Notes |
|---|---|---|
| Current: hatched | White and black diagonal hatch | Baseline, for comparison |
| Whisper hatch | Hatch at 18% ink, 9px spacing | Keeps the Really Bad Chess identity, much less movement |
| Paper grey | White and #e3e3e3, flat | Quietest neutral; recommended |
| Dot grid | Sparse dots on #f1f1f1 | Printed-paper texture without stripes |
| Warm stone | #f7f4ee and #d8d1c4 | Warmer neutral |
| Cool slate | #eef1f5 and #c5cdd8 | Legal moves shift to a brighter cyan-blue to stay distinct |
| Sage | #f1f4ec and #b8c7ae | A muted nod to chess.com's green |
| Ink outline | All white; dark squares get a faint inner frame | Most minimal |

## Rebuild
`npx tsx src/build.ts` (in this folder). Options live in `src/boards.mjs`.
