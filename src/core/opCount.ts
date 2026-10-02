import { countOperations } from './counter';
import { eliminateAugmented, lu, type Pivoting } from './lu';
import { matrix, shape, type Matrix, type Vector } from './matrix';
import { backSub, forwardSub } from './substitution';
import { permuteVector } from './permutation';

export { countOperations, tick } from './counter';

/**
 * Closed forms for large n. Factoring: (n − 1)n(n + 1)/3. Both solves: n².
 * Eliminating [A | b] from scratch: Σ r(r + 2) over the r = n − 1 … 1 rows
 * below each pivot, plus n(n + 1)/2 for back substitution.
 */
export function costFormulas(n: number): { factor: number; solvePair: number; fromScratch: number } {
  let eliminate = 0;
  for (let r = 1; r < n; r++) eliminate += r * (r + 2);
  return { factor: ((n - 1) * n * (n + 1)) / 3, solvePair: n * n, fromScratch: eliminate + (n * (n + 1)) / 2 };
}

/** One right-hand side, eliminated from scratch: reduce [A | b] to [U | c], then back substitute. */
function solveFromScratch(A: Matrix, b: Vector, pivoting: Pivoting = 'partial'): void {
  const { U, c } = eliminateAugmented(A, b, pivoting);
  backSub(U, c);
}

/** L3-K2: counted cost of k right-hand sides, both strategies, as running totals after each b. */
export function costOfRightHandSides(A: Matrix, rhs: Vector[], pivoting: Pivoting = 'partial'): { fromScratch: number[]; withLu: number[] } {
  const { result: f, count: factor } = countOperations(() => lu(A, { pivoting }));
  const fromScratch: number[] = [];
  const withLu: number[] = [];
  let scratchTotal = 0;
  let luTotal = factor;
  for (const b of rhs) {
    scratchTotal += countOperations(() => solveFromScratch(A, b, pivoting)).count;
    luTotal += countOperations(() => {
      const c = forwardSub(f.L, permuteVector(f.P, b)).solution;
      if (c) backSub(f.U, c);
    }).count;
    fromScratch.push(scratchTotal);
    withLu.push(luTotal);
  }
  return { fromScratch, withLu };
}

/** Small seeded generator (mulberry32), so measured points are the same every time. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, { n: number; factor: number; solvePair: number; fromScratch: number }[]>();

/** L3-K3: measured counts for random integer n × n matrices (seeded, so the chart is the same every time; NF-8 caches it). */
export function measuredCosts(sizes: number[], seed = 1): { n: number; factor: number; solvePair: number; fromScratch: number }[] {
  const key = `${sizes.join(',')}|${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const next = random(seed);
  // Nonzero integers in −9 … 9.
  const entry = () => {
    const v = Math.floor(next() * 18) - 9;
    return v >= 0 ? v + 1 : v;
  };
  const result = sizes.map((n) => {
    const A = matrix(Array.from({ length: n }, () => Array.from({ length: n }, entry)));
    const b = matrix([Array.from({ length: n }, entry)])[0];
    const { result: f, count: factor } = countOperations(() => lu(A, { pivoting: 'partial' }));
    const solvePair = countOperations(() => {
      const c = forwardSub(f.L, permuteVector(f.P, b)).solution;
      if (c) backSub(f.U, c);
    }).count;
    const fromScratch = countOperations(() => solveFromScratch(A, b)).count;
    return { n: shape(A).rows, factor, solvePair, fromScratch };
  });
  cache.set(key, result);
  return result;
}
