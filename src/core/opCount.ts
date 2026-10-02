import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';

/**
 * F-M21: operation counting. Core functions call `tick` for every
 * multiplication and division they actually do; multiplying by a known 0 or
 * by L's unit diagonal is free, and so are additions and subtractions.
 */
export function tick(count = 1): void {
  notImplemented('tick');
}

/** Run fn and count the operations it does. Scopes nest; the inner count is added to the outer one. */
export function countOperations<T>(fn: () => T): { result: T; count: number } {
  return notImplemented('countOperations');
}

/** Closed forms for large n: factor (n − 1)n(n + 1)/3; both solves n²; eliminating [A | b] from scratch. */
export function costFormulas(n: number): { factor: number; solvePair: number; fromScratch: number } {
  return notImplemented('costFormulas');
}

/** L3-K2: counted cost of k right-hand sides, both strategies, as running totals after each b. */
export function costOfRightHandSides(A: Matrix, rhs: Vector[]): { fromScratch: number[]; withLu: number[] } {
  return notImplemented('costOfRightHandSides');
}

/** L3-K3: measured counts for random integer n × n matrices (seeded, so the chart is the same every time). */
export function measuredCosts(sizes: number[], seed?: number): { n: number; factor: number; solvePair: number; fromScratch: number }[] {
  return notImplemented('measuredCosts');
}
