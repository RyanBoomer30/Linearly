import { notImplemented } from './notImplemented';
import type { Matrix, Vector } from './matrix';

/** F-M6. Bases follow the notes' conventions:
 *  - C(A): pivot columns of A
 *  - C(Aᵀ): nonzero rows of rref(A)
 *  - N(A): special solutions (one free variable = 1, others 0)
 *  - N(Aᵀ): special solutions of Aᵀy = 0
 */
export function columnSpaceBasis(A: Matrix): Vector[] {
  return notImplemented('columnSpaceBasis');
}

export function rowSpaceBasis(A: Matrix): Vector[] {
  return notImplemented('rowSpaceBasis');
}

export function nullSpaceBasis(A: Matrix): Vector[] {
  return notImplemented('nullSpaceBasis');
}

export function leftNullSpaceBasis(A: Matrix): Vector[] {
  return notImplemented('leftNullSpaceBasis');
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
  return notImplemented('fourSubspaces');
}

/** b ∈ C(A) ⇔ Ax = b is consistent. */
export function inColumnSpace(A: Matrix, b: Vector): boolean {
  return notImplemented('inColumnSpace');
}

/** Distance from b to C(A) in floating point (L1-CS3). */
export function distanceToColumnSpace(A: Matrix, b: Vector): number {
  return notImplemented('distanceToColumnSpace');
}
