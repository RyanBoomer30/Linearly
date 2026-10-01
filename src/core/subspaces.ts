import { getColumn, shape, transpose, type Matrix, type Vector } from './matrix';
import { decomposeColumnLeftNull } from './projection';
import { normFloat } from './products';
import { rref, rrefAugmented } from './rref';
import { specialSolutions } from './solve';

/** F-M6. Bases follow the notes' conventions:
 *  - C(A): pivot columns of A
 *  - C(Aᵀ): nonzero rows of rref(A)
 *  - N(A): special solutions (one free variable = 1, others 0)
 *  - N(Aᵀ): special solutions of Aᵀy = 0
 */
export function columnSpaceBasis(A: Matrix): Vector[] {
  return rref(A).pivotCols.map((j) => getColumn(A, j));
}

export function rowSpaceBasis(A: Matrix): Vector[] {
  const { matrix, pivotCols } = rref(A);
  return matrix.slice(0, pivotCols.length).map((r) => [...r]);
}

export function nullSpaceBasis(A: Matrix): Vector[] {
  const { matrix, pivotCols } = rref(A);
  return specialSolutions(matrix, pivotCols, shape(A).cols).basis;
}

export function leftNullSpaceBasis(A: Matrix): Vector[] {
  return nullSpaceBasis(transpose(A));
}

export interface FourSubspaces {
  m: number;
  n: number;
  rank: number;
  column: Vector[];
  row: Vector[];
  nullSpace: Vector[];
  leftNull: Vector[];
}

export function fourSubspaces(A: Matrix): FourSubspaces {
  const { rows: m, cols: n } = shape(A);
  const row = rowSpaceBasis(A);
  return {
    m,
    n,
    rank: row.length,
    column: columnSpaceBasis(A),
    row,
    nullSpace: nullSpaceBasis(A),
    leftNull: leftNullSpaceBasis(A),
  };
}

/** b ∈ C(A) ⇔ Ax = b is consistent. */
export function inColumnSpace(A: Matrix, b: Vector): boolean {
  return !rrefAugmented(A, b).inconsistent;
}

/** Distance from b to C(A) in floating point (L1-CS3). */
export function distanceToColumnSpace(A: Matrix, b: Vector): number {
  return normFloat(decomposeColumnLeftNull(A, b).e);
}
