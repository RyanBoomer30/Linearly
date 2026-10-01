import { augment, shape, type Matrix, type Vector } from './matrix';
import { Rational } from './rational';
import { applyRowOp, describeRowOp, rowsChangedBy } from './rowops';
import type { Cell, RowOp, Trace, TraceStep } from './trace';

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

/**
 * Gauss–Jordan elimination the way it is done by hand: for each column, take
 * the first nonzero entry at or below the current row as the pivot, swap it
 * up, scale it to 1, then clear the rest of its column. Pivots are only
 * searched in the first `pivotLimit` columns.
 */
function reduce(M0: Matrix, pivotLimit: number, initialText: string): RrefResult {
  let M = M0.map((r) => [...r]);
  const rows = M.length;
  const pivots: Cell[] = [];
  const steps: TraceStep[] = [{ op: null, matrix: M, description: initialText, tex: '', changedRows: [], pivots: [] }];

  const apply = (op: RowOp, pivot: Cell) => {
    M = applyRowOp(M, op);
    const { text, tex } = describeRowOp(op);
    steps.push({ op, matrix: M, description: text, tex, changedRows: rowsChangedBy(op), pivot, pivots: [...pivots] });
  };

  let row = 0;
  for (let col = 0; col < pivotLimit && row < rows; col++) {
    let pr = row;
    while (pr < rows && M[pr][col].isZero()) pr++;
    if (pr === rows) continue; // free column

    const pivot = { row, col };
    pivots.push(pivot);
    if (pr !== row) apply({ kind: 'swap', i: row, j: pr }, pivot);
    const p = M[row][col];
    if (!p.equals(Rational.ONE)) apply({ kind: 'scale', i: row, factor: p.inv() }, pivot);
    for (let r = 0; r < rows; r++) {
      if (r === row || M[r][col].isZero()) continue;
      apply({ kind: 'addMultiple', target: r, source: row, factor: M[r][col].neg() }, pivot);
    }
    row++;
  }

  // The final step always reports every pivot of the result.
  steps[steps.length - 1].pivots = [...pivots];
  return { matrix: M, pivotCols: pivots.map((c) => c.col), trace: { steps } };
}

/** rref(A) with full trace (F-M3). */
export function rref(A: Matrix): RrefResult {
  return reduce(A, shape(A).cols, 'Start with A');
}

/**
 * rref([A | b]) with full trace. Pivots are only searched in the A columns,
 * so pivotCols never includes the augmented column. An inconsistent row is
 * scaled so it reads 0 = 1.
 */
export function rrefAugmented(A: Matrix, b: Vector): AugmentedRrefResult {
  const n = shape(A).cols;
  const result = reduce(augment(A, b), n, 'Start with [A | b]');
  const { steps } = result.trace;

  const inconsistentRow = result.matrix.findIndex((r) => r.slice(0, n).every((x) => x.isZero()) && !r[n].isZero());
  if (inconsistentRow >= 0) {
    const c = result.matrix[inconsistentRow][n];
    if (!c.equals(Rational.ONE)) {
      const op: RowOp = { kind: 'scale', i: inconsistentRow, factor: c.inv() };
      const { text, tex } = describeRowOp(op);
      result.matrix = applyRowOp(result.matrix, op);
      steps.push({ op, matrix: result.matrix, description: text, tex, changedRows: [inconsistentRow], pivots: steps[steps.length - 1].pivots });
    }
    steps[steps.length - 1].notes = [`Row ${inconsistentRow + 1} reads 0 = 1: the system is inconsistent`];
  }

  return { ...result, inconsistent: inconsistentRow >= 0, inconsistentRow: inconsistentRow >= 0 ? inconsistentRow : null };
}

/** F-M4 */
export function pivotColumns(A: Matrix): number[] {
  return rref(A).pivotCols;
}

export function rank(A: Matrix): number {
  return pivotColumns(A).length;
}

/** 0-based indices of free columns / variables. */
export function freeVariables(A: Matrix): number[] {
  const pivots = new Set(pivotColumns(A));
  return Array.from({ length: shape(A).cols }, (_, j) => j).filter((j) => !pivots.has(j));
}
