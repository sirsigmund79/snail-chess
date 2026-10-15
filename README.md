# 🐌 Immortal Snail Chess

Standard chess plus two immortal snails. Every 3 full moves (6 plies) each snail moves one square
toward the enemy king, crushing whatever is on that square. If a snail lands on a king, that king's
side loses.

Everything runs in the browser (static site, no server): the rules engine, a snail-aware search in
a Web Worker, and Stockfish 18 (lite, single-threaded WASM, ~7 MB) in another worker.

## Quick start

```bash
npm install          # also copies Stockfish into public/stockfish/
npm run dev          # http://localhost:5173
npm test             # engine + bot trap suites (pure TS search)
STOCKFISH=1 npm test # also run the trap suites through Stockfish + snail rescoring
npm run selfplay -- --games 20             # Medium vs Hard self-play report
npm run build && npm run preview           # production build
npx tsx scripts/smoke.ts                   # browser smoke test against preview (Chromium)
```

Deploy: `dist/` is a static site (Cloudflare Pages / Vercel). `public/_redirects` gives Pages its
SPA fallback.

## Rules as implemented

| Rule | Behaviour |
|---|---|
| Start | Both snails start on the a-file: White's on **a4** (hunts the Black king), Black's on **a5** (hunts the White king). |
| Timing | A tick fires after plies 6, 12, 18… (after Black's 3rd, 6th… move). White's snail resolves first. |
| Step | `(sign(dFile), sign(dRank))` toward the target king, i.e. one Chebyshev step (diagonal when both axes differ). |
| Clash | If the other snail is on that square, the snail takes another neighbouring square that still strictly shortens its Chebyshev distance (nearest to the king first), or waits. |
| Crush | Any piece on the landing square is removed, of either colour. A crushed king loses immediately (`snail_win_white` / `snail_win_black` name the winner). If White's snail crushes a king, Black's snail does not move that tick. |
| Walls | Nothing may land on a snail. Sliders, pawn double pushes and castling can't pass through one; knights can jump over. Snails also block lines of attack, so they block checks and pins. |
| Snail exposes a king | If a snail stepping away opens a line so that the side to move could capture the enemy king, the side to move wins (reported as `checkmate`). |
| Draws | Stalemate, 50-move rule, insufficient material, threefold repetition (positions include snail squares and the tick phase). |

## Architecture

```
src/engine/   pure rules, no DOM
  types.ts           game state schema (spec §3, plus winner/history/repetition)
  fen.ts             FEN parse/serialise, castling sanitising
  snailEngine.ts     snail step, clash handling, tick + crush
  boardValidator.ts  snail-aware move generation on a chess.js "shadow" position
  game.ts            createGame / applyMove / status / snapshots ("<fen> [S:a4,a5] [P:6]")
src/bot/
  snailEval.ts       material + snail heuristics (α/β distance terms, path and imminent-crush
                     penalties) and a snail-aware alpha-beta search over the real rules
  uci.ts             UCI session, MultiPV parsing, `searchmoves`
  hybrid.ts          move choice: snail tactics pass → Stockfish MultiPV → snail rescoring
  botClient.ts       browser glue (Stockfish worker + search worker)
src/workers/         search.worker.ts, stockfishUci.ts
src/network/         GameTransport interface, room codes (PartyKit transport: TODO)
src/ui/              React + react-chessboard
scripts/             selfplay.ts, smoke.ts, nodeStockfish.ts, copy-stockfish.mjs
```

**Shadow positions.** chess.js knows nothing about snails, so moves are generated on a copy of the
position with a virtual piece of the side to move on each snail square. chess.js then forbids
landing on or sliding through snails, and the snails block enemy attacks on the king. Moves
starting on those squares are dropped.

**Hybrid bot.**
1. A shallow full-width snail-aware search looks for forced snail wins, which Stockfish can't see.
2. Stockfish MultiPV runs with the root restricted (`searchmoves`) to snail-legal moves.
3. Each candidate is rescored as `SF + (snail lookahead − static material)`. Forced wins or
   losses from the lookahead override Stockfish. Stockfish's own scores are clamped (±1500 cp),
   because it treats the virtual blockers as real pieces and can "find" mates that use them.
4. If every candidate is doomed, or Stockfish isn't available, the best move from the full snail
   search is played.

**Variety.** Stockfish is deterministic, so the bot doesn't simply play the top move. It samples
among moves within a per-level margin of the best, weighted by `exp((score − best) / T)`, and
looks at 8 Stockfish lines during the first 8 plies. Forced wins and escapes are never sampled.

| Level | SF depth | Snail lookahead | Margin / T (cp) |
|---|---|---|---|
| Easy | 3 | 1 ply | 150 / 80 |
| Medium | 8 | 2 plies | 40 / 20 |
| Hard | 14 | 3 plies | 25 / 12 |

**Stockfish input.** Stockfish rejects positions with more than 16 pieces per side. A virtual
blocker is only added for a snail while the side to move has room. Otherwise the snail square is
left empty, which is safe because the root is already restricted to snail-legal moves.

## Themes

The board defaults to **Paper grey**: white and #e3e3e3 squares. Selecting or dragging a piece
lights its legal squares in blue, and the squares the snails land on next are coral (`src/ui/theme.ts`).

There's a hidden **Bubblegum Bass** theme, unlocked by a `hyper` URL parameter (`?hyper`,
`?hyper=1` or `?theme=hyper`). The only hint is a message in the browser's developer console.

## Snail playback

A move that triggers the snails plays back as separate beats:

1. The move lands.
2. "The snails stir…"
3. White's snail slides; if it lands on a piece, there's an impact, a board shake and a banner.
4. Black's snail does the same.
5. The board settles.

If a snail crushes a king, the finale is a GTA "WASTED"-style **SLIMED** screen
(`src/ui/SlimedOverlay.tsx`). The lettering is `public/slimed.png`, pre-rendered in Pricedown (GTA's
font) with `npx tsx scripts/render-slimed.ts "path/to/Pricedown Bl.otf"`. Pricedown's free Typodermic
Desktop License doesn't allow embedding the font in an app or sharing the file, only static images,
so only the PNG is committed (`*.otf` and `fonts-local/` are gitignored). Until the image exists the
screen falls back to Bangers.

The bot can think during playback but only moves once the board has settled. Click the board or
press Space to skip. See `src/ui/usePlayback.ts`.

## Not yet done

- Online multiplayer: `/game/:roomId` and the `GameTransport` interface are in place. A PartyKit
  room server that relays moves and broadcasts authoritative snapshots after each tick is next.
- A custom Stockfish build with native snails (spec Part 2, Method 2).

## License

The app code is unlicensed so far. Stockfish (bundled at build time from the `stockfish` npm
package) is GPLv3.
