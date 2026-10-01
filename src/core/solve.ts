import { shape, zeroVector, type Matrix, type Vector } from './matrix';
import { addVectors, linearCombination } from './products';
import { Rational } from './rational';
import { rrefAugmented } from './rref';

/** F-M5 */
export type SolutionSet =
  | { kind: 'none'; inconsistentRow: number }
  | { kind: 'unique'; x: Vector }
  | {
      kind: 'parametric';
      /** Particular solution with every free variable set to 0. */
      particular: Vector;
      /** Special solutions, one per free variable, in free-variable order. */
      nullBasis: Vector[];
      /** 0-based free variable indices. */
      freeVars: number[];
    };

/** Special solutions of R x = 0 for an rref R with the given pivots: one per free column. */
export function specialSolutions(R: Matrix, pivotCols: number[], n: number): { freeVars: number[]; basis: Vector[] } {
  const freeVars = Array.from({ length: n }, (_, j) => j).filter((j) => !pivotCols.includes(j));
  const basis = freeVars.map((f) => {
    const v = zeroVector(n);
    v[f] = Rational.ONE;
    pivotCols.forEach((c, i) => {
      v[c] = R[i][f].neg();
    });
    return v;
  });
  return { freeVars, basis };
}

export function solve(A: Matrix, b: Vector): SolutionSet {
  const n = shape(A).cols;
  const r = rrefAugmented(A, b);
  if (r.inconsistent) return { kind: 'none', inconsistentRow: r.inconsistentRow! };

  const particular = zeroVector(n);
  r.pivotCols.forEach((c, i) => {
    particular[c] = r.matrix[i][n];
  });
  const { freeVars, basis } = specialSolutions(r.matrix, r.pivotCols, n);
  if (freeVars.length === 0) return { kind: 'unique', x: particular };
  return { kind: 'parametric', particular, nullBasis: basis, freeVars };
}

/** particular + Σ tᵢ · nullBasis[i]. */
export function evaluateSolution(particular: Vector, nullBasis: Vector[], params: Rational[]): Vector {
  if (nullBasis.length === 0) return [...particular];
  return addVectors(particular, linearCombination(params, nullBasis));
}
