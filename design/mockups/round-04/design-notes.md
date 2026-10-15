# Design notes: game screen, round 04

## Brief
- **Colour:** like Really Bad Chess. A white board with black diagonal hatching on the dark squares, and bright blue on every legal square once a piece is selected. Coral is a second bright colour, used only for snails (the user's pick).
- **Information layout:** follow chess.com, arranged using Mark Pincus's "Proven, Better, New" approach.

## Proven: chess.com's mobile game screen
- App bar at the top.
- Opponent bar above the board: avatar, name, level in grey, and a clock box on the right.
- Full-width board, with your bar below it in the same format.
- Icon-and-label toolbar at the bottom.
- Horizontal move strip near the top, with the newest move on the right.

## Better
- **Board in thumb reach:** spare height goes above the opponent bar, so the board sits low.
- **Legal moves:** a selected piece turns every legal square bright blue with the hatching showing through, instead of small dots. Legal squares come from the real engine, so snail walls are respected.
- **Danger on legal squares:** a legal square where a snail lands next keeps a coral ring (e2 for the bishop on c4).
- **Buttons:** the toolbar buttons are 58px tall with labels.

## New: the snails, placed where chess.com puts per-player information
- **Clock box:** shows the snail threat to that player's king. Each box shows the hunting snail (yours in the opponent's box, theirs in yours) and its distance in squares. Your box is coral when you're in danger.
- **Countdown:** the app bar's centre (chess.com's logo position) holds ●●● then a snail, with no text. The next dot is coral, and the snail turns coral when it's about to move.
- **On the board:** snails are white tokens with a coral ring, and their next squares are coral with the hatching kept.
- **Rules:** "?" and Rules open a bottom sheet titled "How snails work".

## Assets
- **Pieces:** Cburnett, CC BY-SA 3.0. Really Bad Chess's own artwork is not used.
- **Font:** Figtree (OFL).

## Checks
- **Phone sizes:** no horizontal overflow or page scroll at 360×740, 390×844 and 430×932.
- **Legal squares for the bishop on c4:** b5, a6, d5, e6, f7, d3, e2, f1, b3, a2. These match the engine.
