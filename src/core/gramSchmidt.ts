import { norm } from './exactNorm';
import { asFloat, fDot, fNorm, type AnyMatrix, type AnyVector, type FloatMatrix, type Precision } from './float';
import { fromColumns, getColumn, shape, zeros, type Matrix, type Vector } from './matrix';
import { dot, scaleVector, subVectors } from './products';
import type { Rational } from './rational';

/** F-M28: classical subtracts projections of the original column; modified, of the running vector (L4-GS2). */
export type GsVariant = 'classical' | 'modified';

export type GsStep =
  /** Subtract the projection of column j onto q_i. */
  | { kind: 'project'; column: number; onto: number; coefficient: Rational | number; result: AnyVector; tex: string }
  /** Divide by the length to get q_j. */
  | { kind: 'normalize'; column: number; length: Rational | number; result: AnyVector; tex: string };

export interface GsResult {
  precision: Precision;
  /** m × n with orthonormal columns. */
  Q: AnyMatrix;
  /** n × n upper triangular. */
  R: AnyMatrix;
  steps: GsStep[];
}

const fmt = (x: Rational | number) => (typeof x === 'number' ? String(Number(x.toPrecision(6))) : x.toTex());

function projectTex(i: number, j: number, variant: GsVariant, coefficient: Rational | number): string {
  const against = variant === 'classical' ? `a_${j + 1}` : `v_${j + 1}`;
  return `r_{${i + 1}${j + 1}} = q_${i + 1} \\cdot ${against} = ${fmt(coefficient)},\\quad v_${j + 1} \\leftarrow v_${j + 1} - r_{${i + 1}${j + 1}}\\,q_${i + 1}`;
}

const normalizeTex = (j: number, length: Rational | number) => `q_${j + 1} = \\frac{v_${j + 1}}{\\|v_${j + 1}\\|} = \\frac{v_${j + 1}}{${fmt(length)}}`;

const dependent = (j: number) => new Error(`Column ${j + 1} depends on the earlier columns: Gram–Schmidt cannot normalize a zero vector.`);

/** F-M28 with a trace; exact when every length is rational, as in QR. Throws on dependent columns. */
export function gramSchmidt(A: Matrix, variant: GsVariant, options?: { forceFloat?: boolean }): GsResult {
  if (options?.forceFloat) return gramSchmidtFloatTrace(asFloat(A), variant, 'floating point requested');
  const { cols: n } = shape(A);
  const qs: Vector[] = [];
  const R = zeros(n, n);
  const steps: GsStep[] = [];
  for (let j = 0; j < n; j++) {
    const a = getColumn(A, j);
    let v = a;
    for (let i = 0; i < j; i++) {
      const r = dot(qs[i], variant === 'classical' ? a : v);
      R[i][j] = r;
      v = subVectors(v, scaleVector(r, qs[i]));
      steps.push({ kind: 'project', column: j, onto: i, coefficient: r, result: v, tex: projectTex(i, j, variant, r) });
    }
    const length = norm(v);
    if (length.kind === 'float') return gramSchmidtFloatTrace(asFloat(A), variant, length.reason);
    if (length.value.isZero()) throw dependent(j);
    R[j][j] = length.value;
    const q = v.map((x) => x.div(length.value));
    qs.push(q);
    steps.push({ kind: 'normalize', column: j, length: length.value, result: q, tex: normalizeTex(j, length.value) });
  }
  return { precision: { kind: 'exact' }, Q: fromColumns(qs), R, steps };
}

function gramSchmidtFloatTrace(A: FloatMatrix, variant: GsVariant, reason: string): GsResult {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const qs: number[][] = [];
  const R = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const steps: GsStep[] = [];
  const scale = Math.max(...A.flat().map(Math.abs), Number.MIN_VALUE);
  for (let j = 0; j < n; j++) {
    const a = A.map((r) => r[j]);
    let v = [...a];
    for (let i = 0; i < j; i++) {
      const r = fDot(qs[i], variant === 'classical' ? a : v);
      R[i][j] = r;
      v = v.map((x, k) => x - r * qs[i][k]);
      steps.push({ kind: 'project', column: j, onto: i, coefficient: r, result: v, tex: projectTex(i, j, variant, r) });
    }
    const length = fNorm(v);
    if (length <= m * Number.EPSILON * scale) throw dependent(j);
    R[j][j] = length;
    const q = v.map((x) => x / length);
    qs.push(q);
    steps.push({ kind: 'normalize', column: j, length, result: q, tex: normalizeTex(j, length) });
  }
  return { precision: { kind: 'float', reason }, Q: A.map((_, i) => qs.map((q) => q[i])), R, steps };
}
