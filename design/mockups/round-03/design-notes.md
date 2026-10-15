# Design notes: game screen, round 03

## Feedback on round 02
- **Direction:** keep Paper's restraint, icons and information structure. No big "2 squares" boxes like Reach's.
- **Countdown:** no text; three dots, then a snail icon.
- **Board:** move it down, just above Undo, for thumb reach.
- **Moves:** above the board.
- **Rules:** add a way to open them.
- **Then:** several colour and font combinations of that layout.

## Layout (shared by every theme)
1. **Header:** opponent (name, level, distance from your snail), a Rules "?" button and a menu.
2. **Scoresheet:** move pairs in two columns, filling from the bottom so the latest move sits right above the board. Older moves fade out at the top. A small snail after a pair marks a snail step, with a coloured shell when something was crushed.
3. **Status row:** "Your move", your king's distance from Black's snail in the accent colour, and the countdown: ●●● 🐌. Moves gone are ink, the next one is the accent, and the snail turns the accent colour when it's about to move.
4. **Board:** full width, directly above the buttons.
5. **Buttons:** Undo, Rules, New, 52px tall. The Moves button was dropped because the moves are now always visible.
6. **Rules sheet:** a bottom sheet titled "How snails work" with five short rules (`*-rules.html`).

The empty space between the header and the scoresheet is intentional. It fills with moves as the game goes on.

## Themes
| Theme | Type | Colour | Accent |
|---|---|---|---|
| Paper | DM Sans | Warm off-white, sand board | Coral |
| Mint & Graphite | Manrope | Cool white, grey-green board | Green |
| Sorbet | Figtree | Peach, apricot board | Raspberry |
| Newsprint | Inter + IBM Plex Mono numbers | Grey newsprint, black ink | Signal blue |
| Parlour | Inter + EB Garamond headings | Cream, olive board | Burnt orange |
| Night Moss | Figtree | Dark green-black UI, light stone board | Lemon |

## Checks
- **Phone sizes:** no horizontal overflow and no page scroll at 360×740, 390×844 and 430×932.
- **Night Moss:** the board stays light, because the standard pieces have black and white fills.

## Source
- **Layout:** `src/layout.mjs`.
- **Themes:** `src/themes.mjs`.
- **Rebuild:** `node src/build.mjs`.
- **Pieces:** Cburnett, CC BY-SA 3.0.
