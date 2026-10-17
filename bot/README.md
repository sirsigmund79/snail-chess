# Bot lab: Fairy-Stockfish for snail chess

Everything for training stronger bots lives here and on the `bot-lab` branch, away from the game.
The game only ever receives finished files: an engine build and one small network (`.nnue`)
per variant.

## What's here

| Path | What it is |
|---|---|
| [`sirsigmund79/Fairy-Stockfish`](https://github.com/sirsigmund79/Fairy-Stockfish/tree/snail), branch `snail` | The engine: 12 snail variants added to Fairy-Stockfish, plus `tests/snail/` (rule checks, self-play, matches) and a CI workflow. |
| [`sirsigmund79/variant-nnue-tools`](https://github.com/sirsigmund79/variant-nnue-tools/tree/snail-tools), branch `snail-tools` | The same change for the training-data generator. |
| [`sirsigmund79/variant-nnue-pytorch`](https://github.com/sirsigmund79/variant-nnue-pytorch/tree/snail), branch `snail` | The trainer set up for 7 piece types (chess + snail). |
| `bot/patches/` | The same three changes as patches, plus the data workflow (a backup; the forks are the source of truth; the engine patch leaves out the binary reference positions). |
| `scripts/dump-positions.ts` | Plays seeded random games in every variant with *this* repo's rules engine and writes reference positions. |
| `src/engine/fairy.ts` | Variant names and FEN conversion between the game and the engine. |

The game's TypeScript engine is the reference for the rules. The engine port is checked
against it position by position (see "Checking the rules" below).

## Variants

`snail-<moves>-<movement>-<strength>`: moves between snail steps `2|3|4`, movement `d`
(diagonal, the standard) or `s` (straight, rook steps), strength `u` (unstoppable) or `w`
(weak). `snail-3-d-u` is the standard game. Snails are a custom piece: `S` is White's snail
(it hunts the Black king), `s` is Black's. Start position:

```
rnbqkbnr/pppppppp/8/s7/S7/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

The full-move number matters: snails step after every `2 × moves` plies counted from the
start, and the engine works the count out from it.

How the port works: the snail is an immobile custom piece that move generation never lets
anything capture or land on. Because it's a real piece it blocks sliders, pawn pushes,
castling and checks, and it shows up in the training data and the network inputs. The step runs
at the end of `do_move` (`Position::do_snail_tick`, `Position::snail_step`) and is undone in
`undo_move`. The tick phase is part of the position hash. A crushed king, both kings at once,
or a king left open to capture after a snail step end the game in `is_immediate_game_end`.
The hand-written evaluation has a simple snail-distance term as a starting point.

## Status (verified)

- **Rules:** the engine matches the game's TypeScript engine on legal moves, the position after
  every move, and the game result for all 62,977 positions from 200 games per variant in all 12
  variants (`tests/snail/compare.py`), covering crushes, snail wins, both kings crushed,
  checkmates, dead-position draws, promotions, castling and en passant. Like the game, the
  engine ends dead positions (bare kings, one minor piece, same-coloured bishops) as an
  immediate draw, with snails left out.
- **Search:** engine-vs-engine games in all 12 variants with no crashes and no illegal moves
  (`tests/snail/selfplay.py`).
- **Training data:** `generate_training_data` works for the snail variants. The snails are
  stored in every position, and the trainer's own decoder, configured by the trainer patch,
  reads the boards back exactly as the engine wrote them.
- **Matches:** `tests/snail/match.py` measures one setup against another (checked: full strength
  beats `Skill Level 0` 20–0).
- **Pipeline:** an untrained network exported by the trainer fork loads and searches in the
  engine fork, and the trainer's data loader reads snail training data correctly (checked on
  CPU). Training itself needs a GPU (Colab).
- **Not done yet:** a trained network, and a browser build.

## The repos

The three forks above are public (Fairy-Stockfish is GPLv3, so the source of anything the game
serves has to be). Work on the `snail` / `snail-tools` branches; leave `master` / `tools`
tracking upstream so you can pull in Fairy-Stockfish updates later.

Every push to the engine's `snail` branch runs `.github/workflows/snail.yml`: it builds the
engine and pyffish, checks the committed reference positions
(`tests/snail/positions.jsonl.gz`, 9,734 positions from this repo's rules engine) and plays a
self-play game in every variant. If you change the game's rules, regenerate that file
(`npx tsx scripts/dump-positions.ts --games 16 --seed 7 --out positions.jsonl`, then gzip) and
update the engine until CI is green.

Changes to the engine go into the tools repo too (it's the same engine plus the generator):
copy or cherry-pick them onto `snail-tools`.

## Training: GitHub Actions for data, Colab for the GPU

No local setup needed. Two free/paid cloud services do the heavy lifting:

### 1. Generate training data (GitHub Actions, about an hour)

Open [Actions → Snail training data](https://github.com/sirsigmund79/variant-nnue-tools/actions/workflows/snail-data.yml)
in the tools fork → **Run workflow**. Pick the variant; the defaults (10 million positions,
depth 6, generation 0, no network) are right for a first network. It builds the `snail-tools`
branch, generates in 8 parallel shards plus a 500k-position validation shard (about 50 minutes on
GitHub's 4-core runners), and publishes both files as a release named
`data-<variant>-gen<N>-run<number>`. Public repos don't pay for Actions minutes. Each shard can
run up to 6 hours, so up to about 60 million positions per run.

### 2. Train and test (Colab)

Open the notebook [`snail_colab.ipynb`](https://colab.research.google.com/github/sirsigmund79/variant-nnue-pytorch/blob/snail/snail_colab.ipynb)
from the trainer fork in Colab → Runtime → Change runtime type → a GPU → set the variant and
generation in the first cell → **Run all**. It:

- downloads the newest data release for that variant and generation,
- trains with checkpoints on Google Drive (`MyDrive/snail-bots/<variant>-gen<N>/`); if Colab
  disconnects, Run all again and it resumes from the last checkpoint,
- exports `<variant>-gen<N>.nnue` and `.pt` to the same folder,
- builds the snail engine, checks its rules, and plays a match: the new network against the
  hand-written evaluation (or `OPPONENT_NET`), with the Elo difference and a 95% interval.

The engine only loads a network whose **file name starts with the variant name**
(`snail-3-d-u…nnue`); the notebook names them that way.

### 3. Next generations and other variants

- **Keep a network** only if the match's whole Elo interval is above zero.
- **Next generation:** upload the `.nnue` to a release in the tools fork (Releases → Draft a new
  release → attach it), copy the file's download link, run the workflow with `generation` 1 and
  `net_url` set to it, then run the notebook with `GENERATION = 1` and `OPPONENT_NET` set to the
  previous network on Drive.
- **Other variants:** run the workflow for that variant, then the notebook with that `VARIANT`
  and `INIT_FROM_PT` set to the standard network's `.pt` on Drive (fine-tuning is much cheaper
  than starting from scratch). Ship it only if it beats the standard network in that variant.

### Network size and the web game

With the trainer's default first layer (512 wide, compiled into the engine) a snail network is
about 56 MB: fine for training, testing and generating data, but over Cloudflare's 25 MB per
file and too heavy for phones. The web build will need a narrower first layer in both the
engine and the trainer; that's decided once we know how much the network helps.

### Running things locally instead (optional)

Everything also runs on any Linux machine (or WSL2 on Windows): build `src/` with
`make -j ARCH=x86-64-avx2 build`, build pyffish with `python3 setup.py build_ext --inplace`, and
run the same commands the workflow and notebook run. Checkpoints land in
`<default_root_dir>/lightning_logs/version_N/checkpoints/last.ckpt`.

## Hardware notes

Training needs an NVIDIA GPU with CUDA (the trainer's core layer is CUDA code), hence Colab.
Data generation is CPU work: about 430 positions a second on 4 cores at depth 6, so the 8
parallel Actions runners do 10 million in under an hour. A position is 72 bytes, so 10 million
is about 720 MB.
