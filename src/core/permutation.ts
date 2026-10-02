import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';

/** A row exchange, 0-based. */
export type Swap = [number, number];

/** F-M20: the n × n permutation matrix that applies the swaps in order (P = Pₖ ⋯ P₂P₁). */
export function permutationFromSwaps(n: number, swaps: Swap[]): Matrix {
  return notImplemented('permutationFromSwaps');
}

/** P₂P₁: first apply P₁, then P₂ (the later swap is on the left, L3-PM3). */
export function composePermutations(later: Matrix, earlier: Matrix): Matrix {
  return notImplemented('composePermutations');
}

/** PM: the rows of M in their new order. */
export function permuteRows(P: Matrix, M: Matrix): Matrix {
  return notImplemented('permuteRows');
}

/** Pv */
export function permuteVector(P: Matrix, v: Vector): Vector {
  return notImplemented('permuteVector');
}

/** True for a square 0/1 matrix with exactly one 1 in every row and column. */
export function isPermutation(P: Matrix): boolean {
  return notImplemented('isPermutation');
}

/** All n! permutation matrices for n ≤ 4, identity first (L3-PM2). */
export function allPermutations(n: number): Matrix[] {
  return notImplemented('allPermutations');
}

export function factorial(n: number): number {
  return notImplemented('factorial');
}
