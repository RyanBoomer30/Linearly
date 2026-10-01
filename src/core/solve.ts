import { notImplemented } from './notImplemented';
import type { Matrix, Vector } from './matrix';
import type { Rational } from './rational';

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

export function solve(A: Matrix, b: Vector): SolutionSet {
  return notImplemented('solve');
}

/** particular + Σ tᵢ · nullBasis[i]. */
export function evaluateSolution(
  particular: Vector,
  nullBasis: Vector[],
  params: Rational[],
): Vector {
  return notImplemented('evaluateSolution');
}
