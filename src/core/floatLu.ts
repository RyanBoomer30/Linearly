import { notImplemented } from './notImplemented';
import type { Pivoting } from './lu';

/**
 * F-M22: 64-bit floating-point LU, used only for the pivoting demo (L3-PM6).
 * Floats here are the point: rounding is what the demo shows.
 */
export function luFloat(A: number[][], pivoting: Pivoting): { P: number[][]; L: number[][]; U: number[][] } {
  return notImplemented('luFloat');
}

/** Solve Ax = b in floats through PA = LU. */
export function solveFloat(A: number[][], b: number[], pivoting: Pivoting): number[] {
  return notImplemented('solveFloat');
}
