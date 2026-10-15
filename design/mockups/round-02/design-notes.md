# Design notes: game screen, round 02 (mobile)

## Feedback on round 01
All three directions were rejected. Requested instead: subtle designs inspired by Zach Gage, optimised for mobile.

## What "Zach Gage-inspired" became
His games (Really Bad Chess, Good Sudoku, Knotwords, SpellTower) were treated as a reference for their feel, not something to copy. The observable decisions:
- Flat surfaces: no textures, no 3D, shadows only to lift a card off the background.
- One accent colour per design, used for one meaning (here, snail danger or the next snail step).
- Calm, roomy layout; short, plain microcopy with a little personality.
- The board does the explaining; panels only restate it in words.
- Primary controls at the bottom, at least 48px tall.

None of the three copy a specific game's fonts, colours or layout.

## Directions
| | Paper | Big Number | Reach |
|---|---|---|---|
| Layout | Opponent / board / you, buttons at the bottom | Huge counter, board on a card, moves in a bottom sheet | Edge-to-edge board, two info cards, tab bar |
| Snail threat shown by | Coral tint and dot on the next squares | Dotted paths and amber hops | Tinted reach zone around each snail |
| Countdown | Three dots under the board | The numeral itself | Three dots in a pill, top right |
| Type | DM Sans | Manrope | Figtree |
| Colour | Warm paper, coral | Sage and deep teal, amber | Grey-lilac, violet and rose |

## Mobile checks
- No horizontal overflow at 360×740, 390×844 and 430×932.
- Every design fits without scrolling at all three sizes. On short screens, Big Number shrinks its numeral and shows fewer moves.
- Safe-area insets are respected, and the board is square at any width.

## Assets
- **Pieces:** Cburnett set, CC BY-SA 3.0 (Wikimedia Commons), via the cm-chessboard sprite (MIT); the app already uses these pieces.
- **Snails:** simple flat SVGs drawn per direction.
- **Fonts:** OFL, bundled in `fonts/`.

## Limits
- Static first screens only: no interaction or motion, as Oil UI prescribes for a direction round.
- Screenshots come from `scripts/shot.ts` because Oil UI's own tool can't start Chromium here.
