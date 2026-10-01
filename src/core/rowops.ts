import { notImplemented } from './notImplemented';
import type { Matrix } from './matrix';
import type { RowOp } from './trace';

/** Return a new matrix with the row operation applied. Does not mutate M. */
export function applyRowOp(M: Matrix, op: RowOp): Matrix {
  return notImplemented('applyRowOp');
}

/** Rows (0-based) that the operation can modify. */
export function rowsChangedBy(op: RowOp): number[] {
  return notImplemented('rowsChangedBy');
}

/**
 * Words and notation for a row op, 1-based for display (F-S2).
 * addMultiple(target=1, source=0, factor=-2) →
 *   { text: 'Subtract 2 × row 1 from row 2', tex: 'r_2 - 2r_1' }
 */
export function describeRowOp(op: RowOp): { text: string; tex: string } {
  return notImplemented('describeRowOp');
}
