import { describe, expect, it } from 'vitest';
import { applyMove, createGame } from '../../src/engine/game';
import { fairyVariant, toFairyFen } from '../../src/engine/fairy';
import { DEFAULT_RULES } from '../../src/engine/types';

describe('Fairy-Stockfish bridge', () => {
  it('names the variants', () => {
    expect(fairyVariant(DEFAULT_RULES)).toBe('snail-3-d-u');
    expect(fairyVariant({ movesPerTick: 2, movement: 'straight', strength: 'weak' })).toBe('snail-2-s-w');
  });

  it('writes the start position as the engine starts it', () => {
    expect(toFairyFen(createGame())).toBe('rnbqkbnr/pppppppp/8/s7/S7/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('matches the engine after the first snail step', () => {
    let s = createGame();
    for (const [from, to] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6']] as const) {
      s = applyMove(s, { from, to });
    }
    // From the fork: position startpos moves e2e4 e7e5 g1f3 b8c6 f1c4 g8f6, then `d`.
    expect(toFairyFen(s)).toBe('r1bqkb1r/pppp1ppp/2n2n2/1S2p3/1sB1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
  });
});
