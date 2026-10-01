import { notImplemented } from './notImplemented';
import type { Matrix, Vector } from './matrix';
import type { Trace } from './trace';

export interface RrefResult {
  /** Reduced row echelon form. */
  matrix: Matrix;
  /** 0-based pivot column indices, ascending. */
  pivotCols: number[];
  /** Every intermediate step, starting with the input (F-M3). */
  trace: Trace;
}

export interface AugmentedRrefResult extends RrefResult {
  /** True when a row reduces to [0 … 0 | c] with c ≠ 0. */
  inconsistent: boolean;
  /** 0-based index of the first inconsistent row, if any. */
  inconsistentRow: number | null;
}

/** rref(A) with full trace (F-M3). */
export function rref(A: Matrix): RrefResult {
  return notImplemented('rref');
}

/**
 * rref([A | b]) with full trace. Pivots are only searched in the A columns,
 * so pivotCols never includes the augmented column.
 */
export function rrefAugmented(A: Matrix, b: Vector): AugmentedRrefResult {
  return notImplemented('rrefAugmented');
}

/** F-M4 */
export function pivotColumns(A: Matrix): number[] {
  return notImplemented('pivotColumns');
}

export function rank(A: Matrix): number {
  return notImplemented('rank');
}

/** 0-based indices of free columns / variables. */
export function freeVariables(A: Matrix): number[] {
  return notImplemented('freeVariables');
}
