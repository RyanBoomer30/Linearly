import { identity, shape, type Matrix, type Vector } from './matrix';
import { matMul, matVec } from './products';

/** A row exchange, 0-based. */
export type Swap = [number, number];

/** F-M20: the n × n permutation matrix that applies the swaps in order (P = Pₖ ⋯ P₂P₁). */
export function permutationFromSwaps(n: number, swaps: Swap[]): Matrix {
  const P = identity(n);
  for (const [i, j] of swaps) [P[i], P[j]] = [P[j], P[i]];
  return P;
}

/** P₂P₁: first apply P₁, then P₂ (the later swap is on the left, L3-PM3). */
export function composePermutations(later: Matrix, earlier: Matrix): Matrix {
  return matMul(later, earlier);
}

/** PM: the rows of M in their new order. */
export function permuteRows(P: Matrix, M: Matrix): Matrix {
  return matMul(P, M);
}

/** Pv */
export function permuteVector(P: Matrix, v: Vector): Vector {
  return matVec(P, v);
}

/** True for a square 0/1 matrix with exactly one 1 in every row and column. */
export function isPermutation(P: Matrix): boolean {
  const { rows, cols } = shape(P);
  if (rows !== cols) return false;
  const isUnit = (x: Matrix[number][number]) => x.isZero() || x.isInteger() && x.num === 1n;
  if (!P.every((r) => r.every(isUnit))) return false;
  const ones = (xs: Matrix[number]) => xs.filter((x) => !x.isZero()).length === 1;
  return P.every(ones) && Array.from({ length: cols }, (_, j) => P.map((r) => r[j])).every(ones);
}

/** All n! permutation matrices for n ≤ 4, identity first (L3-PM2). */
export function allPermutations(n: number): Matrix[] {
  if (n < 1 || n > 4) throw new RangeError('Permutation galleries go up to n = 4');
  const orders: number[][] = [];
  const build = (prefix: number[]) => {
    if (prefix.length === n) return void orders.push(prefix);
    for (let k = 0; k < n; k++) if (!prefix.includes(k)) build([...prefix, k]);
  };
  build([]);
  // Row i of P is e_{order[i]}, so (PA)'s row i is A's row order[i].
  return orders.map((order) => order.map((k) => identity(n)[k]));
}

export function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
