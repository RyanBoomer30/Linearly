import { norm } from './exactNorm';
import { asFloat, fDot, fFrobenius, fIdentity, fMatMul, type AnyMatrix, type FloatMatrix, type FloatVector, type Precision } from './float';
import { solveFloat } from './floatLu';
import { embedReflector, embedReflectorFloat, householderToAxis, householderToAxisFloat, type HouseholderSign, type Reflector } from './householder';
import { identity, shape, type Matrix } from './matrix';
import { matMul } from './products';
import type { Cell } from './trace';

export interface QrStep {
  /** 0-based column being cleared. */
  k: number;
  /** The reflector Ĥₖ for x = column k from row k down. */
  reflector: Reflector;
  /** Hₖ embedded in m × m. */
  H: AnyMatrix;
  /** Hₖ ⋯ H₁A after this step. */
  current: AnyMatrix;
  /** H₁ ⋯ Hₖ (L4-QR2). */
  Qsofar: AnyMatrix;
  /** Entries this step made zero (highlighted, L4-QR1). */
  zeroed: Cell[];
  description: string;
  tex: string;
}

export interface QrResult {
  precision: Precision;
  /** m × m */
  Q: AnyMatrix;
  /** m × n */
  R: AnyMatrix;
  /** Reduced: m × n */
  Qhat: AnyMatrix;
  /** Reduced: n × n */
  Rhat: AnyMatrix;
  /** One step per reflector; the first entry of `steps` is the step for column 0. */
  steps: QrStep[];
  /** 0-based columns whose diagonal entry of R is 0 (or negligible in floats): dependent columns (L4-QR6). */
  dependentColumns: number[];
}

const reduce = <T,>(Q: T[][], R: T[][], n: number) => ({ Qhat: Q.map((r) => r.slice(0, n)), Rhat: R.slice(0, n).map((r) => [...r]) });

function stepText(k: number, sign: HouseholderSign) {
  return {
    description: `Reflect column ${k + 1}, from row ${k + 1} down, onto ${sign === 'notes' ? '+' : '−sign(x₁)'}‖x‖e₁`,
    tex: `H_{${k + 1}} = \\begin{bmatrix} I & 0 \\\\ 0 & \\hat H_{${k + 1}} \\end{bmatrix},\\quad \\hat H_{${k + 1}} = I - 2\\frac{vv^T}{\\|v\\|^2}`,
  };
}

/** Columns cleared: one reflector per column while there is something below the diagonal. */
const reflectorCount = (m: number, n: number) => Math.min(n, m - 1);

/**
 * F-M27: Householder QR for m × n with m ≥ n. Runs exactly when every norm
 * is rational (F-M25) and in floating point otherwise; `forceFloat` always
 * uses floats. Throws a RangeError when m < n.
 */
export function qrHouseholder(A: Matrix, options: { sign: HouseholderSign; forceFloat?: boolean }): QrResult {
  const { rows: m, cols: n } = shape(A);
  if (m < n) throw new RangeError(`QR needs at least as many rows as columns; A is ${m}×${n}`);
  if (options.forceFloat) return qrFloatTrace(asFloat(A), options.sign, 'floating point requested');

  let R = A.map((r) => [...r]);
  let Q = identity(m);
  const steps: QrStep[] = [];
  for (let k = 0; k < reflectorCount(m, n); k++) {
    const x = R.slice(k).map((r) => r[k]);
    const length = norm(x);
    if (length.kind === 'float') return qrFloatTrace(asFloat(A), options.sign, length.reason);
    const reflector = householderToAxis(x, options.sign);
    const H = embedReflector(reflector.H as Matrix, m);
    R = matMul(H, R);
    Q = matMul(Q, H);
    steps.push({
      k,
      reflector,
      H,
      current: R,
      Qsofar: Q,
      zeroed: Array.from({ length: m - k - 1 }, (_, i) => ({ row: k + 1 + i, col: k })),
      ...stepText(k, options.sign),
    });
  }
  const dependentColumns = Array.from({ length: n }, (_, k) => k).filter((k) => R[k][k].isZero());
  return { precision: { kind: 'exact' }, Q, R, ...reduce(Q, R, n), steps, dependentColumns };
}

/** The float version with a full trace, used when a norm is irrational. */
function qrFloatTrace(A: FloatMatrix, sign: HouseholderSign, reason: string): QrResult {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  let R = A.map((r) => [...r]);
  let Q = fIdentity(m);
  const steps: QrStep[] = [];
  for (let k = 0; k < reflectorCount(m, n); k++) {
    const reflector = householderToAxisFloat(R.slice(k).map((r) => r[k]), sign, reason);
    const H = embedReflectorFloat(reflector.H, m);
    R = fMatMul(H, R);
    // Entries the reflector clears are zero in exact arithmetic; store them as exact zeros.
    for (let i = k + 1; i < m; i++) R[i][k] = 0;
    Q = fMatMul(Q, H);
    steps.push({
      k,
      reflector,
      H,
      current: R,
      Qsofar: Q,
      zeroed: Array.from({ length: m - k - 1 }, (_, i) => ({ row: k + 1 + i, col: k })),
      ...stepText(k, sign),
    });
  }
  const tolerance = Math.max(m, n) * Number.EPSILON * Math.max(fFrobenius(A), Number.MIN_VALUE);
  const dependentColumns = Array.from({ length: n }, (_, k) => k).filter((k) => Math.abs(R[k][k]) <= tolerance);
  return { precision: { kind: 'float', reason }, Q, R, ...reduce(Q, R, n), steps, dependentColumns };
}

/** Floating-point Householder QR for sweeps (L4-C3): full Q and R. */
export function qrHouseholderFloat(A: FloatMatrix, sign: HouseholderSign): { Q: FloatMatrix; R: FloatMatrix } {
  const r = qrFloatTrace(A, sign, 'floating point');
  return { Q: r.Q as FloatMatrix, R: r.R as FloatMatrix };
}

/**
 * Least squares in floats through Rx = Qᵀb (L4-C3). The reflectors are
 * applied to b directly, as libraries do, rather than forming Q.
 */
export function leastSquaresQrFloat(A: FloatMatrix, b: FloatVector, sign: HouseholderSign): FloatVector {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const R = A.map((r) => [...r]);
  const c = [...b];
  for (let k = 0; k < reflectorCount(m, n); k++) {
    const { v } = householderToAxisFloat(R.slice(k).map((r) => r[k]), sign);
    const vv = fDot(v, v);
    if (vv === 0) continue;
    // H y = y − 2 (v·y / v·v) v on rows k … m − 1.
    for (let j = k; j < n; j++) {
      const s = (2 * v.reduce((acc, vi, i) => acc + vi * R[k + i][j], 0)) / vv;
      v.forEach((vi, i) => (R[k + i][j] -= s * vi));
    }
    const s = (2 * v.reduce((acc, vi, i) => acc + vi * c[k + i], 0)) / vv;
    v.forEach((vi, i) => (c[k + i] -= s * vi));
  }
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = c[i];
    for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j];
    x[i] = s / R[i][i];
  }
  return x;
}

/** Least squares in floats through the normal equation AᵀAx = Aᵀb, solved with float LU (L4-C3). */
export function leastSquaresNormalFloat(A: FloatMatrix, b: FloatVector): FloatVector {
  const At = (A[0] ?? []).map((_, j) => A.map((r) => r[j]));
  const AtA = fMatMul(At, A);
  const Atb = At.map((r) => fDot(r, b));
  return solveFloat(AtA, Atb, 'partial');
}
