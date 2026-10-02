import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';
import type { Trace } from './trace';

/** F-M16: the two ways to compute BC (notes §3.1). */
export type ProductMode = 'rowsByColumns' | 'columnsByRows';

export type ProductOp =
  /** Entry (i, j) = (row i of B) · (column j of C). */
  | { kind: 'entry'; i: number; j: number; terms: [Rational, Rational][]; value: Rational }
  /** Column k of B times row k of C: one rank-1 (or zero) layer. */
  | { kind: 'outer'; k: number; column: Vector; row: Vector; layer: Matrix };

/**
 * One step per entry (rows × columns) or per outer product (columns × rows).
 * Each step's `matrix` is the partial product so far: entries not yet
 * computed are 0 in rows × columns mode; the running sum in columns × rows.
 * The first step (op null) is the zero matrix.
 */
export type ProductTrace = Trace<ProductOp>;

export function shapeMismatch(B: Matrix, C: Matrix): string | null {
  return notImplemented('shapeMismatch');
}

/** BC with the trace of the chosen mode. Throws a RangeError when the inner sizes differ. */
export function multiplyTrace(B: Matrix, C: Matrix, mode: ProductMode): { result: Matrix; trace: ProductTrace } {
  return notImplemented('multiplyTrace');
}

/** The rank-1 layers b_k c_k* of BC, k = 1 … p (L3-R1). */
export function outerLayers(B: Matrix, C: Matrix): Matrix[] {
  return notImplemented('outerLayers');
}
