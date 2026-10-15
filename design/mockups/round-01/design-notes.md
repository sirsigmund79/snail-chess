# Design notes: game screen, round 01

## Task
- **Users:** casual players who want a quick, funny chess variant against the bot or a friend.
- **Main action:** make a move while keeping track of where the snails will land next.
- **Device:** desktop browser at 1440×900, the target for this round. Mobile comes after a direction is picked.

## Shared brief
All three mockups show the same moment:
- Move 9, you are White against the Medium bot.
- The snails move after Black's next move.
- Your snail (c6) is about to crush Black's bishop on d7. Black's snail (f3) is 2 squares from your king and steps to e2 next.
- The move log includes the step that crushed White's knight on f3.

The game data lives once in `src/scene.mjs`. Each direction has its own template in `src/<name>.mjs`; rebuild with `node src/build.mjs`.

## Category and benchmarks
- **Category:** casual browser chess variant. The board is the workspace, so the first screen is the game itself.
- **Benchmarks:** lichess and chess.com. Not viewed, from memory: both sites are blocked by this environment's network policy.
  - lichess: board first, quiet chrome, the move list in a right-hand panel.
  - chess.com: green board, heavy chrome around it.
- **Default this round avoids:** board on the left, panel on the right. Garden Patio and the B-movie poster both break it; Field Notes keeps a two-page version of it on purpose.

## Tone
Lively, polished, medium density, medium-heavy weight, playful. The evidence is the existing SLIMED finale and the snail premise; it's still a real strategy game, so the board must stay readable.

## Directions
| | Garden Patio | Field Notes | Attack of the Immortal Snail |
|---|---|---|---|
| Engine | Material × place: wet stone patio after rain | Another medium: naturalist's specimen notebook | Cultural grammar: 1950s B-movie posters |
| Layout | Centred board, players at opposite corners, dock with shell countdown and move ribbon | Two-page spread: ink plate and observation log | Tagline on top, tilted board stage, starburst callouts, credits as move log |
| Type | Fraunces + Inter | EB Garamond + IBM Plex Mono | Bangers + Oswald |
| Colour | Slate/moss with amber | Paper/sepia with red pencil | Bruise purple, toxic green, poster red |
| Main visual | Slime trails and target rings | Pen-and-ink specimens with red rings | Glowing snail monsters on the stage |

## Limits of this round
- **Pieces:** Unicode glyphs. Their look varies by operating system; the real app would use an SVG piece set.
- **Snails:** the emoji, or a hand-drawn SVG in Field Notes. No generated artwork; there's no image generation here.
- **Scope:** static first screens only. No interaction, no motion, no responsive layout, no review round, as Oil UI prescribes for a direction round.
- **Screenshot tool:** Oil UI's own tool couldn't launch Chromium here (running as root), so screenshots come from `scripts/shot.ts`, a Playwright fallback.

## Next
Pick a direction and say what you like or don't, then the full game screen gets built in the app.
