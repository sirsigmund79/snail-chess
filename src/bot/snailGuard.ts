import { inCheck } from '../engine/boardValidator';
import { findKing, opposite, parseFen } from '../engine/fen';
import { applyMove, getLegalMoves, turn } from '../engine/game';
import { pliesUntilTick, snailDistance } from '../engine/snailEngine';
import type { Color, ImmortalChessState, MoveInput } from '../engine/types';
import { toInput } from './snailEval';

export type GuardResult =
  /** A move that wins on the spot (checkmate, or a snail crushes their king first). */
  | { kind: 'win'; move: MoveInput }
  /** Our king dies at the coming snail step unless we play one of these moves. */
  | { kind: 'restrict'; allowed: MoveInput[] }
  | null;

/**
 * Hard rule on top of the search: if the enemy snail is next to our king and steps before our
 * next turn, only allow moves that keep the king alive, unless we can win right now.
 * "Alive" is checked exactly: after our move, no opponent reply may let the snails crush our king
 * (this also covers "our snail crushes their king first", since White's snail moves first).
 */
export function snailGuard(state: ImmortalChessState): GuardResult {
  const us = turn(state);
  const them = opposite(us);
  const king = findKing(parseFen(state.fen).board, us);
  if (!king) return null;
  const snailNextToKing = snailDistance(king, state.snails[them].square, state.rules.movement) <= 1;
  const snailsMoveBeforeOurNextTurn = pliesUntilTick(state.plyCount, state.rules) <= 2;
  if (!snailNextToKing || !snailsMoveBeforeOurNextTurn) return null;

  const legal = getLegalMoves(state);
  const children = legal.map((m) => ({ move: toInput(m), child: applyMove(state, toInput(m), { fast: true, legal }) }));

  // 1. Winning right now beats running away.
  const win = children.find(({ child }) => child.winner === us || isCheckmated(child, them));
  if (win) return { kind: 'win', move: win.move };

  // 2. Otherwise only keep moves after which the king survives every reply. Both kings falling at
  //    once is a draw, but it still counts as losing ours: stepping aside may win outright.
  const safe = children.filter(({ child }) => survivesEveryReply(child, us));
  if (safe.length === 0 || safe.length === children.length) return null; // lost anyway / no danger
  return { kind: 'restrict', allowed: safe.map((c) => c.move) };
}

function isCheckmated(state: ImmortalChessState, color: Color): boolean {
  return (
    state.gameStatus === 'in_progress' &&
    turn(state) === color &&
    getLegalMoves(state).length === 0 &&
    inCheck(state.fen, state.snails)
  );
}

/** Our king is still on the board: not lost, and not crushed in a both-kings draw either. */
const kingAlive = (s: ImmortalChessState, us: Color) => s.winner !== opposite(us) && s.drawReason !== 'both_kings_crushed';

function survivesEveryReply(child: ImmortalChessState, us: Color): boolean {
  if (child.gameStatus !== 'in_progress') return kingAlive(child, us);
  const replies = getLegalMoves(child);
  return replies.every((r) => kingAlive(applyMove(child, toInput(r), { fast: true, legal: replies }), us));
}
