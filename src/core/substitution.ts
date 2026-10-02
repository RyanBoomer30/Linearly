import { tick } from './counter';
import { shape, zeroVector, type Matrix, type Vector } from './matrix';
import { Rational } from './rational';

export interface SubstitutionStep {
  /** 0-based unknown solved in this step. */
  index: number;
  value: Rational;
  /** Row of the triangular matrix in use (L3-S1). */
  row: number;
  /** "c_2 = b_2 - l_{21}c_1 = 5 - 2·2 = 1" */
  tex: string;
  description: string;
}

export interface SubstitutionResult {
  /** null when back substitution stopped at a zero pivot. */
  solution: Vector | null;
  steps: SubstitutionStep[];
  stopped: { index: number; reason: string } | null;
}

const paren = (x: Rational) => (x.isNegative() ? `(${x.toTex()})` : x.toTex());

/**
 * One unknown: (rhs − Σ T[i][j]·known[j]) / T[i][i]. Counts a multiplication
 * for each nonzero coefficient and the division, except that dividing by L's
 * unit diagonal is free (`unitDiagonal`).
 */
function solveRow(
  T: Matrix,
  rhs: Vector,
  known: Vector,
  i: number,
  js: number[],
  names: { unknown: string; matrix: string; rhs: string },
  unitDiagonal: boolean,
): SubstitutionStep {
  const terms = js.filter((j) => !T[i][j].isZero());
  let value = rhs[i];
  for (const j of terms) {
    tick();
    value = value.sub(T[i][j].mul(known[j]));
  }
  const pivot = T[i][i];
  const divide = !(unitDiagonal && pivot.equals(Rational.ONE));
  if (divide) {
    tick();
    value = value.div(pivot);
  }
  const u = (j: number) => `${names.unknown}_${j + 1}`;
  const symbolic = terms.map((j) => ` - ${names.matrix}_{${i + 1}${j + 1}}${u(j)}`).join('');
  const numeric = terms.map((j) => ` - ${paren(T[i][j])}\\cdot ${paren(known[j])}`).join('');
  const over = divide && !pivot.equals(Rational.ONE) ? `\\big/ ${paren(pivot)}` : '';
  const tex =
    terms.length === 0 && over === ''
      ? `${u(i)} = ${names.rhs}_${i + 1} = ${value.toTex()}`
      : `${u(i)} = (${names.rhs}_${i + 1}${symbolic})${over} = (${rhs[i].toTex()}${numeric})${over} = ${value.toTex()}`;
  const subscript = String(i + 1).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
  return { index: i, value, row: i, tex, description: `Row ${i + 1} gives ${names.unknown}${subscript}:` };
}

/** F-M18: solve Lc = b top to bottom. L is lower triangular (unit diagonal not required). */
export function forwardSub(L: Matrix, b: Vector): SubstitutionResult {
  const n = shape(L).rows;
  if (b.length !== n) throw new RangeError('forwardSub: b must have one entry per row of L');
  const c = zeroVector(n);
  const steps: SubstitutionStep[] = [];
  for (let i = 0; i < n; i++) {
    if (L[i][i].isZero()) {
      return { solution: null, steps, stopped: { index: i, reason: `The pivot in row ${i + 1} of L is 0, so c_${i + 1} cannot be found.` } };
    }
    const step = solveRow(L, b, c, i, Array.from({ length: i }, (_, j) => j), { unknown: 'c', matrix: 'l', rhs: 'b' }, true);
    c[i] = step.value;
    steps.push(step);
  }
  return { solution: c, steps, stopped: null };
}

/** F-M18: solve Ux = c bottom to top; stops with a reason at a zero pivot. */
export function backSub(U: Matrix, c: Vector): SubstitutionResult {
  const n = shape(U).rows;
  if (c.length !== n) throw new RangeError('backSub: c must have one entry per row of U');
  const x = zeroVector(n);
  const steps: SubstitutionStep[] = [];
  for (let i = n - 1; i >= 0; i--) {
    if (U[i][i].isZero()) {
      return {
        solution: null,
        steps,
        stopped: { index: i, reason: `The pivot in row ${i + 1} of U is 0, so Ux = c has no unique solution.` },
      };
    }
    const step = solveRow(U, c, x, i, Array.from({ length: n - 1 - i }, (_, k) => i + 1 + k), { unknown: 'x', matrix: 'u', rhs: 'c' }, false);
    x[i] = step.value;
    steps.push(step);
  }
  return { solution: x, steps, stopped: null };
}
