import type { Matrix, Vector } from '../core/matrix';
import { notImplemented } from '../core/notImplemented';

export interface Lesson7System {
  /** The SVD view's matrix (§11.1). */
  A: Matrix;
  /** The PCA data: x₁ and x₂ (plus the demo shift, L7-P2), and y for the regressions (§11.4). */
  X: Matrix;
  y: Vector;
  invalid: { A: [number, number][]; table: [number, number][] };
}

/**
 * Parse the SVD matrix and the PCA table exactly (F-E2); bad cells are flagged
 * and read as 0. `shift` is added to both x columns (the "shift the data" demo).
 */
export function parseLesson7(svdCells: string[][], pcaCells: string[][], shift: number): Lesson7System {
  return notImplemented('parseLesson7');
}
