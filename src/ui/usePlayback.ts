import { useCallback, useEffect, useState } from 'react';
import { parseFen, serializeFen, sqIndex } from '../engine/fen';
import type { Color, ImmortalChessState, MoveRecord, Piece, SnailState, Square } from '../engine/types';

type Snails = { w: SnailState; b: SnailState };

export interface Frame {
  fen: string;
  snails: Snails;
  /** Big centred announcement ("White's snail crushed Black's knight!"). */
  banner?: { text: string; tone: 'info' | 'danger' };
  /** One-shot impact effect; `key` changes each time so the animation restarts. */
  crush?: { square: Square; key: string };
  /** Snails are about to move: make their target squares throb. */
  imminent?: boolean;
  /** How long to hold this frame before advancing (ms). */
  hold: number;
}

const NAME: Record<Color, string> = { w: 'White', b: 'Black' };
const PIECE: Record<Piece['type'], string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'KING',
};

export const TIMING = {
  afterMove: 650,
  stir: 750,
  slide: 650,
  impact: 1100,
  quietStep: 350,
};

/** Break a move that triggered a snail tick into separate beats. */
export function framesFor(record: MoveRecord, final: ImmortalChessState): Frame[] {
  if (!record.tick || !record.fenBeforeTick) return [];
  const snails: Snails = { w: { ...final.snails.w }, b: { ...final.snails.b } };
  for (const sm of record.tick.moves) snails[sm.color] = { ...snails[sm.color], square: sm.from };

  const frames: Frame[] = [];
  let fen = record.fenBeforeTick;
  let current = snails;
  frames.push({ fen, snails: current, hold: TIMING.afterMove });
  frames.push({ fen, snails: current, imminent: true, banner: { text: '🐌 The snails stir…', tone: 'info' }, hold: TIMING.stir });

  for (const sm of record.tick.moves) {
    current = { ...current, [sm.color]: { ...current[sm.color], square: sm.to } };
    // Slide onto the square while the victim is still standing there…
    frames.push({
      fen,
      snails: current,
      banner: { text: `${NAME[sm.color]}'s snail creeps ${sm.from} → ${sm.to}`, tone: 'info' },
      hold: sm.crushed ? TIMING.slide : TIMING.slide + TIMING.quietStep,
    });
    if (sm.crushed) {
      // …then crush it.
      const p = parseFen(fen);
      p.board[sqIndex(sm.to)] = null;
      fen = serializeFen(p);
      const victim = `${NAME[sm.crushed.color]}'s ${PIECE[sm.crushed.type]}`;
      frames.push({
        fen,
        snails: current,
        crush: { square: sm.to, key: `${record.tick.ply}-${sm.color}` },
        banner: {
          text: sm.crushed.type === 'k' ? `💀 ${NAME[sm.color]}'s snail crushed ${victim}!` : `💥 ${NAME[sm.color]}'s snail crushed ${victim}!`,
          tone: 'danger',
        },
        hold: TIMING.impact,
      });
    }
  }
  return frames;
}

const finalFrame = (s: ImmortalChessState): Frame => ({ fen: s.fen, snails: s.snails, hold: 0 });

/**
 * Turns committed game states into what the board should show right now. Ordinary moves show
 * immediately; a move that triggers the snails plays back as: the move → "the snails stir" →
 * White's snail step (→ crush) → Black's snail step (→ crush) → settled position.
 */
export function usePlayback(state: ImmortalChessState) {
  // Derived during render (React's "adjust state on prop change" pattern) so there is never a
  // render where the new position shows before its playback starts.
  const [track, setTrack] = useState<{ state: ImmortalChessState; queue: Frame[] }>({ state, queue: [] });
  let current = track;
  if (track.state !== state) {
    const prev = track.state;
    const grewByOne =
      state.history.length === prev.history.length + 1 &&
      state.history[state.history.length - 2] === prev.history[prev.history.length - 1];
    current = { state, queue: grewByOne ? framesFor(state.history[state.history.length - 1], state) : [] };
    setTrack(current);
  }
  const { queue } = current;

  useEffect(() => {
    if (!queue.length) return;
    const t = setTimeout(() => setTrack((tr) => ({ ...tr, queue: tr.queue.slice(1) })), queue[0].hold);
    return () => clearTimeout(t);
  }, [queue]);

  const skip = useCallback(() => setTrack((tr) => ({ ...tr, queue: [] })), []);

  return { frame: queue[0] ?? finalFrame(state), busy: queue.length > 0, skip };
}
