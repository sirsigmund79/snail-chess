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
| `bot/patches/` | The same three changes as patches (a backup; the forks are the source of truth; the engine patch leaves out the binary reference positions). |
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
- **Not done yet:** training networks (needs an NVIDIA GPU, see below), and a browser build.

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

## Step 4 on Windows

Use WSL2 (a real Linux inside Windows). The engine, generator and trainer all build there
unchanged, and it's much faster than building natively.

### 1. Install WSL2 and tools (once)

In PowerShell as administrator:

```powershell
wsl --install -d Ubuntu
```

Reboot, open "Ubuntu" from the Start menu, and create a user. WSL gets half your RAM by
default (about 4 GB on your laptop), which is tight. Create `C:\Users\<you>\.wslconfig`:

```ini
[wsl2]
memory=6GB
processors=8
```

then `wsl --shutdown` in PowerShell and reopen Ubuntu. Inside Ubuntu:

```bash
sudo apt update
sudo apt install -y build-essential git cmake python3-venv python3-dev curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
```

Keep all repos and data in your Linux home (`~/`), not under `/mnt/c`: file access across to
Windows is many times slower.

### 2. Build the engine and the generator

```bash
mkdir -p ~/snail && cd ~/snail
git clone -b snail https://github.com/sirsigmund79/Fairy-Stockfish
git clone -b snail-tools https://github.com/sirsigmund79/variant-nnue-tools
git clone https://github.com/sirsigmund79/snail-chess && (cd snail-chess && npm install)

# i5-8300H supports BMI2: the fastest build for it
(cd Fairy-Stockfish/src && make -j8 ARCH=x86-64-bmi2 build)
(cd variant-nnue-tools/src && make -j8 ARCH=x86-64-bmi2 build)
```

### 3. Check the rules match the game (every time either side changes)

```bash
cd ~/snail/Fairy-Stockfish
python3 -m venv ~/snail/venv && ~/snail/venv/bin/pip install setuptools
~/snail/venv/bin/python setup.py build_ext --inplace        # builds pyffish from your fork

cd ~/snail/snail-chess
npx tsx scripts/dump-positions.ts --games 100 --out ~/snail/positions.jsonl
~/snail/venv/bin/python ~/snail/Fairy-Stockfish/tests/snail/compare.py ~/snail/positions.jsonl
~/snail/venv/bin/python ~/snail/Fairy-Stockfish/tests/snail/selfplay.py ~/snail/Fairy-Stockfish/src/stockfish
```

`compare.py` must print `all match`. Don't train on an engine that doesn't.

### 4. Generate training data

Generation 0 uses the hand-written evaluation. One variant at a time:

```bash
mkdir -p ~/snail/data && cd ~/snail/data
V=snail-3-d-u
printf "uci
setoption name UCI_Variant value $V
setoption name Use NNUE value false
setoption name Threads value 7
setoption name Hash value 1024
isready
generate_training_data depth 6 count 10000000 random_multi_pv 4 random_multi_pv_diff 100 random_move_count 8 random_move_max_ply 20 write_min_ply 5 eval_limit 10000 set_recommended_uci_options data_format bin output_file_name $V-gen0.bin
quit
" | ~/snail/variant-nnue-tools/src/stockfish
```

Then a smaller validation file the same way (`count 500000`, `output_file_name $V-val.bin`).

Sizes and speed: 72 bytes per position, so 10M positions is about 720 MB. On a comparable
4-core machine this ran at about 430 positions a second, so 10M takes 6–7 hours and is a good
overnight run on your laptop (plug it in; it will run hot). To check a file:
`convert_plain targetfile $V-gen0.bin output_file_name $V-gen0.txt` in the same engine prints
it as text.

### 5. Train (on a GPU, not your laptop)

The trainer's core layer is custom CUDA code, so it only runs on NVIDIA GPUs. Your laptop has
Intel graphics, so do this step on a rented or free cloud GPU:

- **Google Colab (free T4, session limits):** fine for first networks on 10M positions.
- **A rented GPU by the hour** (RunPod, Vast.ai, Lambda and similar): for bigger runs.

On the GPU machine:

```bash
git clone -b snail https://github.com/sirsigmund79/variant-nnue-pytorch && cd variant-nnue-pytorch
python3 -m venv env && . env/bin/activate && pip install -r requirements.txt
sh compile_data_loader.bat
# upload snail-3-d-u-gen0.bin and snail-3-d-u-val.bin, then:
python train.py snail-3-d-u-gen0.bin snail-3-d-u-val.bin --gpus 1 --threads 4 --num-workers 4 \
  --batch-size 16384 --random-fen-skipping 3 --features=HalfKAv2^ --max_epochs 400
# checkpoints land under logs/ (the newest version_N folder)
python serialize.py logs/default/version_0/checkpoints/last.ckpt snail-3-d-u.nnue
```

Download only the `.nnue` (a few MB), never the checkpoints.

### 6. Test the network

```bash
cd ~/snail/Fairy-Stockfish/src
printf "uci\nsetoption name UCI_Variant value snail-3-d-u\nsetoption name EvalFile value $HOME/snail/snail-3-d-u.nnue\nposition startpos\ngo depth 12\nquit\n" | ./stockfish
```

It should report `NNUE evaluation using ...` and no errors. Then play it against the previous
best (for the first network, against the hand-written evaluation):

```bash
cd ~/snail/Fairy-Stockfish
~/snail/venv/bin/python tests/snail/match.py --variant snail-3-d-u --games 400 --movetime 50 \
  --a src/stockfish --a-opt EvalFile=$HOME/snail/snail-3-d-u.nnue \
  --b src/stockfish --b-opt "Use NNUE=false"
```

It plays each random opening twice with colours swapped and prints wins/draws/losses for A and
the Elo difference with a 95% interval. Keep the new network only if the whole interval is
above zero; if it straddles zero, play more games. 400 games at 50 ms a move takes about an
hour on your laptop.

### 7. Next generations and variants

- Generate new data *with* the new network (`setoption name EvalFile ...`, and leave
  `Use NNUE` on), train again, and test against the last network.
- For other variants, start from the standard network with a smaller data set from that
  variant: `python serialize.py <standard checkpoint> standard.pt`, then train with
  `--resume-from-model standard.pt`. Ship the result only if it beats the standard network in
  that variant.

## Your laptop (i5-8300H, 8 GB RAM, Intel UHD 630, 238 GB SSD with about 27 GB free)

| Job | Verdict |
|---|---|
| Building, rule checks, self-play | Fine. |
| Generating training data | Fine, but slow: about 10M positions overnight per variant. Leave one core free, keep it plugged in, and watch disk space (each 10M is about 720 MB). |
| Training networks | No: needs an NVIDIA GPU with CUDA. Use Colab or a rented GPU. |
| Testing networks (engine matches) | Fine, overnight for a few thousand short games. |
| Disk | 27 GB free is enough for a few data sets at a time. Delete old generations once a network is trained from them. |
