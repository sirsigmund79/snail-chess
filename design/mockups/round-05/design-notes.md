# Design notes: game screen, round 05

## Changes from round 04 (user feedback)
- **Snails on the board:** drawn plain, with no coral ring. Their next squares keep the coral styling.
- **Board position:** slightly higher, with up to 40px of space between your bar and the toolbar.
- **Move dots instead of the snail-distance boxes:** each player's bar shows their three moves in the current cycle.
  - Filled = played; hollow = still to come.
  - The active one, the move being made now, has a slightly bolder, larger ring.
  - Black's bar ends with the snail icon, since the snails move right after Black's third move.
  - The snail icon stays ink and only turns coral (and bold) on the snails' move (`snails.html`).
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
