import type { Matrix, Vector } from '../core/matrix';
import { Rational } from '../core/rational';

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
  const cell = (text: string, flag: () => void) => {
    const r = Rational.parse(text.trim());
    if (r) return r;
    flag();
    return Rational.ZERO;
  };
  const invalidA: [number, number][] = [];
  const A = svdCells.map((row, i) => row.map((t, j) => cell(t, () => invalidA.push([i, j]))));
  const invalidTable: [number, number][] = [];
  const table = pcaCells.map((row, i) => row.map((t, j) => cell(t, () => invalidTable.push([i, j]))));
  const s = Rational.of(shift);
  return {
    A,
    X: table.map((row) => [row[0].add(s), row[1].add(s)]),
    y: table.map((row) => row[2] ?? Rational.ZERO),
    invalid: { A: invalidA, table: invalidTable },
  };
}
