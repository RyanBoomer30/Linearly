import type { Matrix } from './matrix';
import type { Rational } from './rational';

/**
 * Shared trace format (§3.2). Every stepper — elimination now, LU / QR /
 * policy iteration later — plays a Trace.
 */

/** Elementary row operations. Indices are 0-based. */
export type RowOp =
  | { kind: 'swap'; i: number; j: number }
  /** row[i] ← factor · row[i] */
  | { kind: 'scale'; i: number; factor: Rational }
  /** row[target] ← row[target] + factor · row[source] */
  | { kind: 'addMultiple'; target: number; source: number; factor: Rational };

export interface Cell {
  row: number;
  col: number;
}

export interface TraceStep<Op = RowOp> {
  /** null for the initial state. */
  op: Op | null;
  /** Matrix after the operation. */
  matrix: Matrix;
  /** Plain-language description, e.g. "Subtract 2 × row 1 from row 2". */
  description: string;
  /** Notation, e.g. "r_2 - 2r_1". */
  tex: string;
  /** Rows modified by this step (0-based). */
  changedRows: number[];
  /** Pivot being worked on during this step, if any. */
  pivot?: Cell;
  /** Pivots confirmed so far. */
  pivots: Cell[];
  /** Free-form annotations (e.g. "inconsistent row"). */
  notes?: string[];
}

export interface Trace<Op = RowOp> {
  steps: TraceStep<Op>[];
}
