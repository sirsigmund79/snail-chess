import { useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { PromotionPieceOption, Square as BoardSquare } from 'react-chessboard/dist/chessboard/types';
import { nextSnailStep, pliesUntilTick } from '../engine/snailEngine';
import { findKing, parseFen } from '../engine/fen';
import type { Color, ImmortalChessState, MoveInput, Square } from '../engine/types';

const snailImage = (color: Color, flip: boolean) => {
  const ring = color === 'w' ? '#fafaf9' : '#1c1917';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='44' fill='${ring}' fill-opacity='0.55'/><text x='50' y='68' font-size='58' text-anchor='middle'${flip ? " transform='translate(100 0) scale(-1 1)'" : ''}>🐌</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

interface Props {
  state: ImmortalChessState;
  orientation: 'white' | 'black';
  interactive: boolean;
  onMove: (move: MoveInput) => boolean;
}

export function SnailBoard({ state, orientation, interactive, onMove }: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const { board } = useMemo(() => parseFen(state.fen), [state.fen]);
  const last = state.history[state.history.length - 1];
  const lastTick = last?.tick;

  const styles = useMemo(() => {
    const out: Partial<Record<Square, Record<string, string | number>>> = {};
    if (last) {
      out[last.from] = { backgroundColor: 'rgba(250, 204, 21, 0.35)' };
      out[last.to] = { backgroundColor: 'rgba(250, 204, 21, 0.45)' };
    }
    if (selected) out[selected] = { backgroundColor: 'rgba(16, 185, 129, 0.45)' };
    const tickNext = pliesUntilTick(state.plyCount) === 1;
    for (const color of ['w', 'b'] as const) {
      const snail = state.snails[color];
      const enemy = color === 'w' ? 'b' : 'w';
      const king = findKing(board, enemy);
      if (!king) continue;
      const step = nextSnailStep(snail.square, king, state.snails[enemy].square);
      const facingRight = step[0] > snail.square[0];
      out[snail.square] = {
        ...out[snail.square],
        backgroundImage: snailImage(color, orientation === 'white' ? facingRight : !facingRight),
        backgroundSize: '90%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        cursor: 'not-allowed',
      };
      if (step !== snail.square) {
        out[step] = {
          ...out[step],
          boxShadow: `inset 0 0 0 ${tickNext ? 4 : 2}px ${color === 'w' ? 'rgba(14,165,233,0.9)' : 'rgba(239,68,68,0.9)'}`,
        };
      }
    }
    for (const sm of lastTick?.moves ?? []) {
      if (sm.crushed) out[sm.to] = { ...out[sm.to], outline: '3px solid rgba(220,38,38,0.8)', outlineOffset: '-3px' };
    }
    return out;
  }, [state, board, last, lastTick, selected, orientation]);

  const tryMove = (from: Square, to: Square, promotion?: MoveInput['promotion']) => {
    setSelected(null);
    return onMove({ from, to, ...(promotion ? { promotion } : {}) });
  };

  const turnColor = state.fen.split(' ')[1] as Color;

  return (
    <Chessboard
      id="snail-board"
      position={state.fen}
      boardOrientation={orientation}
      arePiecesDraggable={interactive}
      isDraggablePiece={({ piece }) => interactive && piece[0] === turnColor}
      customSquareStyles={styles as Record<BoardSquare, Record<string, string | number>>}
      // Promotions go through onPromotionPieceSelect instead.
      onPieceDrop={(from, to) => tryMove(from as Square, to as Square)}
      onPromotionPieceSelect={(piece?: PromotionPieceOption, from?: BoardSquare, to?: BoardSquare) => {
        if (!piece || !from || !to) return false;
        return tryMove(from as Square, to as Square, piece[1].toLowerCase() as MoveInput['promotion']);
      }}
      onSquareClick={(sq) => {
        if (!interactive) return;
        const square = sq as Square;
        const piece = board[(Number(square[1]) - 1) * 8 + (square.charCodeAt(0) - 97)];
        if (selected && selected !== square) {
          const from = board[(Number(selected[1]) - 1) * 8 + (selected.charCodeAt(0) - 97)];
          const promo = from?.type === 'p' && (square[1] === '8' || square[1] === '1') ? 'q' : undefined;
          if (tryMove(selected, square, promo)) return;
        }
        setSelected(piece && piece.color === turnColor ? square : null);
      }}
      customBoardStyle={{ borderRadius: 6, boxShadow: '0 6px 24px rgba(0,0,0,0.25)' }}
      animationDuration={200}
    />
  );
}
