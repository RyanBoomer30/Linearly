import type { Matrix, Vector } from '../core/matrix';
import { Rational } from '../core/rational';

export interface Lesson5System {
  /** Exact, so decimals such as 0.7 become 7/10 (F-M11). */
  P: Matrix;
  x0: Vector;
  invalid: { P: [number, number][]; x0: number[] };
}

/** Parse the chain editors exactly (F-E2); bad cells are flagged and read as 0. */
export function parseLesson5(pCells: string[][], x0Cells: string[]): Lesson5System {
  const cell = (text: string, flag: () => void) => {
    const r = Rational.parse(text);
    if (r) return r;
    flag();
    return Rational.ZERO;
  };
  const invalidP: [number, number][] = [];
  const P = pCells.map((row, i) => row.map((t, j) => cell(t, () => invalidP.push([i, j]))));
  const invalidX0: number[] = [];
  const x0 = x0Cells.map((t, i) => cell(t, () => invalidX0.push(i)));
  return { P, x0, invalid: { P: invalidP, x0: invalidX0 } };
}
