# 🐌 Immortal Snail Chess

Standard chess plus two immortal snails. Every 3 full moves (6 plies) each snail moves one square
toward the enemy king, crushing whatever is on that square. If a snail lands on a king, that king's
side loses.

Bot and same-phone games run entirely in the browser: the rules engine, a snail-aware search in a
Web Worker, and Stockfish 18 (lite, single-threaded WASM, ~7 MB) in another worker. Online games
with a friend go through a small Cloudflare Worker with one Durable Object per room.

## Quick start

```bash
npm install          # also copies Stockfish into public/stockfish/
npm run dev          # http://localhost:5173
npm run dev:worker   # online rooms in dev: run alongside `npm run dev` (needs one `npm run build` first)
npm test             # engine + bot trap suites (pure TS search)
STOCKFISH=1 npm test # also run the trap suites through Stockfish + snail rescoring
npm run selfplay -- --games 20             # Medium vs Hard self-play report
npm run build && npm run preview           # production build
npx tsx scripts/smoke.ts                   # browser smoke test against preview (Chromium)
npm run build && npx wrangler dev          # the real Worker + rooms at http://localhost:8787
npx tsx scripts/online-smoke.ts            # two-browser online test against wrangler dev
```

## Deploy (Cloudflare Workers → chess.stbinf.com)

The app is a static Vite build, served as Workers static assets, plus a Worker (`worker/`) that
only runs for `/api/*`. `wrangler.jsonc` points wrangler at `dist/`, turns on single-page-app
fallback (so `/game/ABC123` loads the app), and binds the `Room` Durable Object. The first deploy
creates the Durable Object class from the `v1` migration; nothing needs setting up by hand. The
Stockfish lite WASM is 7.3 MB, under the 25 MiB per-file limit. `public/_headers` lets browsers
cache the fingerprinted `/assets/*` forever and Stockfish for a day.

**Workers Builds settings** (Workers & Pages → snail-chess → Settings → Build):
- **Production branch:** `main`.
- **Build command:** `npm run build`.
- **Deploy command:** `npx wrangler deploy`.
- **Build variable:** `NODE_VERSION=22`.

**Custom domain:** go to Settings → Domains & Routes → Add → Custom Domain and enter
`chess.stbinf.com`. Cloudflare creates the DNS record and certificate itself, so don't add a CNAME
by hand.

## Rules as implemented

| Rule | Behaviour |
|---|---|
| Start | Both snails start on the a-file: White's on **a4** (hunts the Black king), Black's on **a5** (hunts the White king). |
| Timing | A tick fires after plies 6, 12, 18… (after Black's 3rd, 6th… move). White's snail resolves first. |
| Step | `(sign(dFile), sign(dRank))` toward the target king, i.e. one Chebyshev step (diagonal when both axes differ). |
| Clash | If the other snail is on that square, the snail takes another neighbouring square that still strictly shortens its Chebyshev distance (nearest to the king first), or waits. |
| Crush | Any piece on the landing square is removed, of either colour. A crushed king loses immediately (`snail_win_white` / `snail_win_black` name the winner). If both snails land on both kings in the same snail move, it's a draw (`both_kings_crushed`). If White's snail crushes the Black king and Black's snail can't reach the White king, Black's snail doesn't move. |
| Walls | Nothing may land on a snail. Sliders, pawn double pushes and castling can't pass through one; knights can jump over. Snails also block lines of attack, so they block checks and pins. |
| Snail exposes a king | If a snail stepping away opens a line so that the side to move could capture the enemy king, the side to move wins (reported as `checkmate`). |
| Draws | Stalemate, 50-move rule, insufficient material, threefold repetition (positions include snail squares and the tick phase). |

**Online variants.** The person who creates an online room can change three rules while waiting
for their friend (`GameRules` in `src/engine/types.ts`, kept across rematches): snails step every
**2, 3 or 4** full moves; **no diagonals** (rook steps along the longer axis, rank on a tie;
distance is Manhattan); and **weak** snails, which only crush the king they hunt. Any other piece
blocks a weak snail, so it takes the first step of the shortest path around it (BFS over open
squares), or an open square that still gets closer if it's walled in, or waits. A snail that
waits because it's blocked is recorded in the tick's `bumps`, and playback shows it lunging at
the square it wanted and being pushed back. Bot and same-phone
games always use the defaults.

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
src/ui/              React + react-chessboard, phone-first (design: design/mockups/round-05)
  GameScreen.tsx     app bar, move strip, player bars with move dots, board, toolbar, result card
  Sheets.tsx         menu (new game settings), How to play, moves list, result card
  SnailBoard.tsx     board, legal / snail-square highlights, snail overlay, crush + banners
  SnailIcon.tsx      the flat snail used everywhere
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

**Calm vs snail positions.** While no snail is within two squares of a king and no snail step is
about to crush a piece, the position is "calm": Stockfish's score decides, nudged only by the
static snail terms (capped per level). Otherwise the snail lookahead rescores in full, and if the
bot's king is in danger it adds the snail search's favourites and king moves to Stockfish's
shortlist (scored by a second, restricted Stockfish search) and picks with Medium's tight margin
even on Easy.

**Escape check.** The snail is slow but its route is fixed, so the evaluation plays the chase out
exactly with everything except the king frozen: the king's real number of moves between snail
steps, each a king step, castling or a move elsewhere. A king that can't dodge the snail past its
next 1–4 steps is penalised (1200/700/400/200), so boxed-in kings (uncastled with the f8 bishop
home, or castled behind three pawns) start making room long before the search could see the
crush. A snail step that crushes both kings at once scores as a draw.

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

The default is **Walnut**: a dark page (#1b1714) with cream text, so it's comfortable to watch for
long stretches (e.g. on a stream), and a #f0d9b5 / #b58863 board. Selecting or dragging a piece
lights its legal squares in blue, and the squares the snails land on next are coral (`src/ui/theme.ts`).

There's a hidden **Bubblegum Bass** theme, unlocked by a `hyper` URL parameter (`?hyper`,
`?hyper=1` or `?theme=hyper`). The only hint is a message in the browser's developer console.

## Analytics (PostHog)

Page views plus a few events, using PostHog's free tier:
- `game_started`: sent on a game's first move.
  - Properties: `opponent` (bot or friend), `difficulty`, `player_color`, `theme`.
- `game_ended`: sent when the game finishes.
  - Properties: as above, plus `result` (slimed, checkmate or draw), `winner`, `player_won` and `moves`.
- `online_room_created`, `online_invite_shared`: someone made a room / tapped the invite button.

Online games have `opponent: online` and are counted once per player (two `game_started` per game).

Autocapture and session recording are off, and PostHog stores nothing in cookies or localStorage
(memory persistence). The library is only downloaded when a key is configured.

To turn it on, add these as **build** variables (Workers & Pages → snail-chess → Settings → Build →
Variables and secrets), then redeploy. Vite reads them at build time, so runtime variables won't
work:
- `VITE_POSTHOG_KEY`: your project API key, `phc_…`, from PostHog → Project settings.
- `VITE_POSTHOG_HOST`: `https://us.i.posthog.com` (or `https://eu.i.posthog.com` for EU projects).

Locally, analytics stays off unless you create `.env.local` (see `.env.example`).
`scripts/check-analytics.ts` verifies the events against a fake host without sending anything.

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

## Online play

Menu → **Play a friend online** creates a room (`/game/ABC234`) and shows an invite link. The
first person in the room plays White, the second Black, and anyone after that watches. A refresh or
reconnect keeps your seat (a random player id in `localStorage`). After the game, **Rematch** swaps
colours.

- `worker/index.ts`: routes `/api/room/:code/ws` to that room's Durable Object (same-origin only).
- `worker/room.ts`: the room. It is authoritative: it replays moves through the same engine and
  rejects illegal, out-of-turn or stale moves, so a client can't cheat. It uses the WebSocket
  Hibernation API, so a room sleeps between moves and isn't billed while it waits. Keepalive pings
  are answered without waking it. A room deletes itself a day after everyone has left.
- `src/network/protocol.ts`: the wire messages (`hello`, `move`, `rematch` → `state`).
- `src/ui/useOnlineGame.ts`: the client. It plays your move straight away, rebuilds from the
  server's move list (animating only new moves), and reconnects with backoff.

## Not yet done

- A custom Stockfish build with native snails (spec Part 2, Method 2).

## License

The app code is unlicensed so far. Stockfish (bundled at build time from the `stockfish` npm
package) is GPLv3.
