import { matrix, matrixEquals, vector, vectorEquals, type Matrix, type Vector } from '../core/matrix';

/**
 * Where the Lesson 2 notes round a least-squares solution (L2-N6, L2-D7). The
 * notes write θ* = 3 and θ* = (2.5, 1.58); the exact values are 400/133 and
 * (5/2, 30/19).
 */
const ROUNDED: { X: Matrix; Y: Vector; notes: string; formula: string; exact: string }[] = [
  {
    X: matrix([[1], ['2.25'], ['1.5']]),
    Y: vector([4, 6, 5]),
    notes: '3',
    formula: 'h(x) = 3x',
    exact: '400/133 ≈ 3.008',
  },
  {
    X: matrix([
      [1, 1],
      [1, '2.25'],
      [1, '1.5'],
    ]),
    Y: vector([4, 6, 5]),
    notes: '(2.5, 1.58)',
    formula: 'h(x) = 2.5 + 1.58x',
    exact: '(5/2, 30/19) ≈ (2.5, 1.579)',
  },
];

/** "The notes round θ* to 3 (h(x) = 3x); the exact value is 400/133 ≈ 3.008." null when X, Y are not a notes figure. */
export function notesRoundingNote(X: Matrix, Y: Vector, name: string): string | null {
  const hit = ROUNDED.find((r) => matrixEquals(r.X, X) && vectorEquals(r.Y, Y));
  return hit ? `The Lesson 2 notes round ${name} to ${hit.notes} (${hit.formula}); the exact value is ${hit.exact}.` : null;
}
