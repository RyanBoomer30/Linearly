import type { Matrix } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';
import type { Cell, TraceStep } from './trace';
import type { Swap } from './permutation';

/** F-M17: when to exchange rows. */
export type Pivoting = 'none' | 'zero-only' | 'partial';

export type LuOp =
  | { kind: 'swap'; i: number; j: number }
  /** row[target] ← row[target] − multiplier · row[source]; the multiplier is L[target][source]. */
  | { kind: 'eliminate'; target: number; source: number; multiplier: Rational };

export interface LuStep extends TraceStep<LuOp> {
  /** L so far: 1s on the diagonal, multipliers found so far below it (L3-LU2). */
  L: Matrix;
  /** P so far: every swap made so far. */
  P: Matrix;
  /** Compact storage: the current matrix with multipliers in place of the zeros below the diagonal (L3-LU4). */
  compact: Matrix;
}

export type LuStatus =
  | { kind: 'complete' }
  /** A has no nonzero pivot in this column: LU exists but U is singular (L3-LU7). */
  | { kind: 'singular'; column: number }
  /** No pivoting and a zero pivot with a nonzero entry below: a row exchange is needed (L3-LU6). */
  | { kind: 'stopped'; column: number; reason: string };

export interface LuResult {
  P: Matrix;
  L: Matrix;
  U: Matrix;
  /** U with the multipliers stored below the diagonal. */
  compact: Matrix;
  swaps: Swap[];
  /** Every multiplier, in the order found. */
  multipliers: { row: number; col: number; value: Rational }[];
  /** Pivot positions in U. */
  pivots: Cell[];
  /** The first step (op null) is A itself. */
  trace: { steps: LuStep[] };
  status: LuStatus;
}

/** F-M17: PA = LU for square A. When stopped, P, L and U are as far as elimination got. */
export function lu(A: Matrix, options: { pivoting: Pivoting }): LuResult {
  return notImplemented('lu');
}

export interface LduResult {
  L: Matrix;
  D: Matrix;
  /** U divided row by row by its pivots: 1s on the diagonal. */
  U: Matrix;
  /** 0-based rows of U whose pivot is 0: D is singular there (L3-D3). */
  zeroPivots: number[];
}

/** F-M19: A = LDU from A = LU. Rows with a zero pivot are left as they are. */
export function ldu(L: Matrix, U: Matrix): LduResult {
  return notImplemented('ldu');
}

/**
 * L3-LU3: A peeled into rank-1 pieces. Layer k is (column k of L)(row k of U);
 * remainders[k] = A − (layers 1 … k+1). With pivoting, A means PA.
 */
export function peel(L: Matrix, U: Matrix): { layers: Matrix[]; remainders: Matrix[] } {
  return notImplemented('peel');
}
