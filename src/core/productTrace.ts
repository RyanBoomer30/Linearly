import { getColumn, getRow, shape, zeros, type Matrix, type Vector } from './matrix';
import { dot, outer } from './products';
import type { Rational } from './rational';
import type { Trace, TraceStep } from './trace';

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
  const b = shape(B);
  const c = shape(C);
  if (b.cols === c.rows) return null;
  return `Inner sizes don't match: B is ${b.rows}×${b.cols} and C is ${c.rows}×${c.cols}, so B needs as many columns as C has rows.`;
}

const tupleTex = (v: Vector) => `(${v.map((x) => x.toTex()).join(',')})`;
const factorTex = (x: Rational) => (x.isNegative() ? `(${x.toTex()})` : x.toTex());

/** BC with the trace of the chosen mode. Throws a RangeError when the inner sizes differ. */
export function multiplyTrace(B: Matrix, C: Matrix, mode: ProductMode): { result: Matrix; trace: ProductTrace } {
  const mismatch = shapeMismatch(B, C);
  if (mismatch) throw new RangeError(mismatch);
  const { rows: m, cols: p } = shape(B);
  const n = shape(C).cols;
  let partial = zeros(m, n);
  const steps: TraceStep<ProductOp>[] = [
    { op: null, matrix: partial, description: 'Start with the zero matrix', tex: '', changedRows: [], pivots: [] },
  ];

  if (mode === 'rowsByColumns') {
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const row = getRow(B, i);
        const col = getColumn(C, j);
        const value = dot(row, col);
        partial = partial.map((r, a) => r.map((x, b) => (a === i && b === j ? value : x)));
        const sum = row.map((x, k) => `${factorTex(x)}\\cdot ${factorTex(col[k])}`).join(' + ');
        steps.push({
          op: { kind: 'entry', i, j, terms: row.map((x, k) => [x, col[k]] as [Rational, Rational]), value },
          matrix: partial,
          description: `Entry (${i + 1}, ${j + 1}) = row ${i + 1} of B · column ${j + 1} of C`,
          tex: `${tupleTex(row)}\\cdot${tupleTex(col)} = ${sum} = ${value.toTex()}`,
          changedRows: [i],
          pivots: [],
        });
      }
    }
  } else {
    for (let k = 0; k < p; k++) {
      const column = getColumn(B, k);
      const row = getRow(C, k);
      const layer = outer(column, row);
      partial = partial.map((r, a) => r.map((x, b) => x.add(layer[a][b])));
      steps.push({
        op: { kind: 'outer', k, column, row, layer },
        matrix: partial,
        description: `Add column ${k + 1} of B times row ${k + 1} of C`,
        tex: `b_${k + 1}c_${k + 1}^* = ${tupleTex(column)}${tupleTex(row)}`,
        changedRows: Array.from({ length: m }, (_, i) => i),
        pivots: [],
      });
    }
  }
  return { result: partial, trace: { steps } };
}

/** The rank-1 layers b_k c_k* of BC, k = 1 … p (L3-R1). */
export function outerLayers(B: Matrix, C: Matrix): Matrix[] {
  const mismatch = shapeMismatch(B, C);
  if (mismatch) throw new RangeError(mismatch);
  return Array.from({ length: shape(B).cols }, (_, k) => outer(getColumn(B, k), getRow(C, k)));
}
