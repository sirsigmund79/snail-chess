# Design notes: game screen, round 05

## Changes from round 04 (user feedback)
- **Snails on the board:** drawn plain, with no coral ring. Their next squares keep the coral styling.
- **Board position:** slightly higher, with up to 40px of space between your bar and the toolbar.
- **Move dots instead of the snail-distance boxes:** each player's bar shows their three moves in the current cycle.
  - Filled = played; hollow = still to come.
  - The active one, the move being made now, has a slightly bolder, larger ring.
  - Each bar ends with that player's snail icon: White's bar with the white snail, Black's with the black snail.
  - Both snail icons stay ink and only turn coral (and bold) on the snails' move (`snails.html`).
- **Countdown:** removed from the app bar, which now shows the snail icon and "Immortal Snail Chess".
- **How to play sheet:**
  - The header shows the snail icon, "Immortal Snail Chess" and "How to play".
  - Rules 1–3 now read:
    1. Snails hunt the kings. Each snail takes the most direct path to the opposite king.
    2. Every three moves, they step. Each snail moves one square closer.
    3. Snails are unstoppable. They capture anything on the square they land on. If a snail captures a king, game over.
  - Rules 4–5 are unchanged.
- **Both snails start on the a-file**, White's on a4 and Black's on a5. This is a real rule change in the engine (`DEFAULT_SNAILS` in `src/engine/types.ts`).
  - The mock position is replayed through the engine from the new start and checked (`src/legal.ts`).
  - After two snail steps, Black's snail is on c3, having crushed White's c3 pawn, and steps onto your knight on d2 next.

## Checks
- **Phone sizes:** no horizontal overflow or page scroll at 360×740, 390×844 and 430×932.
- **Legal squares for the bishop on c4:** come from the real engine.

## End screens (all played through the real engine, `src/endings.ts`)
- **Snail takes a king (`end-slimed.html`, then `end-slimed-result.html`):**
  - The game continues from the mock position with 9.Qe2 O-O 10.b3 Re8 11.Bb2 Nc6 12.Bc1 Kh8. Black castles away from your snail while your king stays on e1, and at ply 24 Black's snail steps d2→e1 and crushes it.
  - **First beat:** the SLIMED finale. The screen drains to grey, a dark band crosses it, and SLIMED lands with drips and a caption.
  - **Second beat:** a result card with a coral snail emblem, "Slimed.", "Black's snail got your king on e1.", the winner and move count, then Rematch, Review and New game. The card sits high, so the coral crushed square on e1 stays visible.
- **Normal checkmate (`end-checkmate.html`):**
  - A Scholar's mate with the snails on the board: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#.
  - The ending is calm, with no SLIMED: the mated king gets a thick ink box and a small #. The result card has a blue king emblem, "Checkmate." and "You win with Qxf7#." It sits low so the mated king stays visible.
- **Same buttons in both cases:** Rematch is the primary action, as on chess.com, with Review and New game below.
