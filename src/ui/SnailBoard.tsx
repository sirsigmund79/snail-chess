import { useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { PromotionPieceOption, Square as BoardSquare } from 'react-chessboard/dist/chessboard/types';
import { findKing, parseFen, sqToCoords } from '../engine/fen';
import { legalMoves } from '../engine/boardValidator';
import { nextSnailStep } from '../engine/snailEngine';
import { SnailIcon } from './SnailIcon';
import { ACTIVE_THEME as T } from './theme';
import type { Color, MoveInput, MoveRecord, Square } from '../engine/types';
import type { Frame } from './usePlayback';

interface Props {
  frame: Frame;
  lastMove?: MoveRecord;
  orientation: 'white' | 'black';
  interactive: boolean;
  /** Snails move after the next ply: make their target squares throb. */
  imminent: boolean;
  /** Playback in progress: a click skips it instead of selecting a piece. */
  busy: boolean;
  onSkip: () => void;
  onMove: (move: MoveInput) => boolean;
}

/** Top-left corner of a square as percentages of the board, honouring orientation. */
function place(sq: Square, orientation: 'white' | 'black') {
  const [f, r] = sqToCoords(sq);
  const col = orientation === 'white' ? f : 7 - f;
  const row = orientation === 'white' ? 7 - r : r;
  return { left: `${col * 12.5}%`, top: `${row * 12.5}%` };
}

export function SnailBoard({ frame, lastMove, orientation, interactive, imminent, busy, onSkip, onMove }: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const { board, turn: turnColor } = useMemo(() => parseFen(frame.fen), [frame.fen]);

  // Board shake on every crush.
  const crushKey = frame.crush?.key;
  useEffect(() => {
    if (!crushKey || !shakeRef.current?.animate) return;
    shakeRef.current.animate(
      [
        { transform: 'translate(0,0)' },
        { transform: 'translate(-6px, 3px) rotate(-0.6deg)' },
        { transform: 'translate(5px, -4px) rotate(0.5deg)' },
        { transform: 'translate(-4px, 2px)' },
        { transform: 'translate(3px, -1px)' },
        { transform: 'translate(0,0)' },
      ],
      { duration: 450, easing: 'ease-out' },
    );
  }, [crushKey]);

  const snails = (['w', 'b'] as const).map((color) => {
    const enemy: Color = color === 'w' ? 'b' : 'w';
    const snail = frame.snails[color];
    const king = findKing(board, enemy);
    const next = king ? nextSnailStep(snail.square, king, frame.snails[enemy].square) : snail.square;
    const [sf] = sqToCoords(snail.square);
    const [nf] = sqToCoords(next);
    const movesLeftOnScreen = orientation === 'white' ? nf < sf : nf > sf;
    return { color, square: snail.square, next, faceLeft: movesLeftOnScreen };
  });

  // Squares the selected (or dragged) piece can legally reach, snail rules included.
  const activeFrom = dragFrom ?? selected;
  const legalTargets = useMemo(() => {
    if (!activeFrom || !interactive) return new Set<Square>();
    return new Set(legalMoves(frame.fen, frame.snails).filter((m) => m.from === activeFrom).map((m) => m.to as Square));
  }, [activeFrom, interactive, frame.fen, frame.snails]);

  const isDark = (sq: Square) => {
    const [f, r] = sqToCoords(sq);
    return (f + r) % 2 === 0;
  };
  const snailNext = snails.map((s) => s.next).filter((sq, i) => sq !== snails[i].square);
  const snailNextKey = snailNext.join(',');

  const squareStyles = useMemo(() => {
    const out: Partial<Record<Square, Record<string, string | number>>> = {};
    if (lastMove) {
      out[lastMove.from] = { backgroundColor: T.lastMove };
      out[lastMove.to] = { backgroundColor: T.lastMove };
    }
    for (const sq of snailNextKey ? (snailNextKey.split(',') as Square[]) : []) {
      out[sq] = { backgroundColor: isDark(sq) ? T.snailDark : T.snail };
    }
    for (const sq of legalTargets) {
      const onSnailPath = snailNextKey.split(',').includes(sq);
      out[sq] = {
        backgroundColor: isDark(sq) ? T.legalDark : T.legal,
        // A legal square the snail lands on next keeps a snail-coloured warning ring.
        ...(onSnailPath ? { boxShadow: `inset 0 0 0 4px ${T.snail}` } : {}),
      };
    }
    if (activeFrom) {
      out[activeFrom] = { backgroundColor: isDark(activeFrom) ? T.legalDark : T.legal, boxShadow: `inset 0 0 0 4px ${T.selectedRing}` };
    }
    return out;
  }, [lastMove, legalTargets, activeFrom, snailNextKey]);

  const tryMove = (from: Square, to: Square, promotion?: MoveInput['promotion']) => {
    setSelected(null);
    return onMove({ from, to, ...(promotion ? { promotion } : {}) });
  };
  const pieceAt = (sq: Square) => board[(Number(sq[1]) - 1) * 8 + (sq.charCodeAt(0) - 97)];

  return (
    <div ref={shakeRef} className="board-frame" onClickCapture={(e) => {
      if (busy) {
        e.stopPropagation();
        onSkip();
      }
    }}>
      <Chessboard
        id="snail-board"
        position={frame.fen}
        boardOrientation={orientation}
        arePiecesDraggable={interactive}
        isDraggablePiece={({ piece }) => interactive && piece[0] === turnColor}
        onPieceDragBegin={(_, from) => setDragFrom(from as Square)}
        onPieceDragEnd={() => setDragFrom(null)}
        customLightSquareStyle={{ backgroundColor: T.light }}
        customDarkSquareStyle={{ backgroundColor: T.dark }}
        customSquareStyles={squareStyles as Record<BoardSquare, Record<string, string | number>>}
        // Promotions go through onPromotionPieceSelect instead.
        onPieceDrop={(from, to) => {
          setDragFrom(null);
          return tryMove(from as Square, to as Square);
        }}
        onPromotionPieceSelect={(piece?: PromotionPieceOption, from?: BoardSquare, to?: BoardSquare) => {
          if (!piece || !from || !to) return false;
          return tryMove(from as Square, to as Square, piece[1].toLowerCase() as MoveInput['promotion']);
        }}
        onSquareClick={(sq) => {
          if (!interactive) return;
          const square = sq as Square;
          if (selected && selected !== square) {
            const from = pieceAt(selected);
            const promo = from?.type === 'p' && (square[1] === '8' || square[1] === '1') ? 'q' : undefined;
            if (tryMove(selected, square, promo)) return;
          }
          const piece = pieceAt(square);
          setSelected(piece && piece.color === turnColor ? square : null);
        }}
        customNotationStyle={{ fontSize: '9px', fontWeight: 700, opacity: 0.55 }}
        animationDuration={250}
      />

      <div className="board-overlay" aria-hidden>
        {snails.map((s) =>
          s.next === s.square ? null : (
            <div
              key={`target-${s.color}`}
              className={`snail-target snail-target-${s.color} ${imminent || frame.imminent ? 'snail-target-imminent' : ''}`}
              style={{ ...place(s.next, orientation), width: '12.5%', height: '12.5%' }}
            />
          ),
        )}
        {frame.crush && (
          <div key={frame.crush.key} className="snail-crush" style={{ ...place(frame.crush.square, orientation), width: '12.5%', height: '12.5%' }} />
        )}
        {snails.map((s) => (
          <div
            key={`snail-${s.color}`}
            data-testid={`snail-piece-${s.color}`}
            data-snail-square={s.square}
            className="snail-piece"
            style={{ ...place(s.square, orientation), width: '12.5%', height: '12.5%' }}
          >
            <SnailIcon side={s.color} className={`board-snail${s.faceLeft ? ' face-left' : ''}`} />
          </div>
        ))}
      </div>

      <div aria-live="polite" className="banner-slot">
        {frame.banner && (
          <div key={frame.banner.text} data-testid="snail-banner" className={`snail-banner tone-${frame.banner.tone}`}>
            {frame.banner.text}
          </div>
        )}
      </div>
    </div>
  );
}
