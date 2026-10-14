import { describe, expect, it } from 'vitest';
import { chooseMove, LEVELS, sampleMove, type Level } from '../../src/bot/hybrid';
import { seededRng } from '../../src/bot/rng';
import { MATE, scoreMoves } from '../../src/bot/snailEval';
import { applyMove, createGame } from '../../src/engine';

const lookahead = (s: Parameters<typeof scoreMoves>[0], d: number, only?: Parameters<typeof scoreMoves>[3]) =>
  scoreMoves(s, d, undefined, only).scored;

describe('bot variety', () => {
  const afterE4 = applyMove(createGame(), { from: 'e2', to: 'e4' });

  it.each(['easy', 'medium'] as Level[])('%s answers 1.e4 in more than one way across seeds', async (level) => {
    const replies = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const { move, candidates } = await chooseMove(afterE4, level, { lookahead, rng: seededRng(seed) });
      replies.add(move.from + move.to);
      const best = Math.max(...candidates.map((c) => c.final));
      const chosen = candidates.find((c) => c.uci === move.from + move.to)!;
      expect(best - chosen.final).toBeLessThanOrEqual(LEVELS[level].margin);
    }
    expect(replies.size).toBeGreaterThanOrEqual(2);
  });

  it('is reproducible with the same seed', async () => {
    const a = await chooseMove(afterE4, 'medium', { lookahead, rng: seededRng(7) });
    const b = await chooseMove(afterE4, 'medium', { lookahead, rng: seededRng(7) });
    expect(a.move).toEqual(b.move);
  });
});

describe('sampleMove', () => {
  const cfg = LEVELS.hard;

  it('never picks outside the margin', () => {
    const rows = [{ final: 100 }, { final: 90 }, { final: 40 }];
    for (let seed = 1; seed < 200; seed++) {
      expect(sampleMove(rows, cfg, seededRng(seed)).final).toBeGreaterThanOrEqual(100 - cfg.margin);
    }
  });

  it('always takes a forced win', () => {
    const rows = [{ final: MATE - 3 }, { final: MATE - 5 }, { final: 50 }];
    expect(sampleMove(rows, cfg, () => 0.99).final).toBe(MATE - 3);
  });

  it('spreads choices among near-equal moves', () => {
    const rows = [{ final: 30 }, { final: 28 }, { final: 25 }];
    const picks = new Set(Array.from({ length: 50 }, (_, i) => sampleMove(rows, cfg, seededRng(i + 1)).final));
    expect(picks.size).toBeGreaterThanOrEqual(2);
  });
});
