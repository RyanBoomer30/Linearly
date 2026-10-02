import { norm } from './exactNorm';
import { fDot, fIdentity, fNorm, type FloatMatrix, type FloatVector, type Precision } from './float';
import { identity, isZeroVector, type Matrix, type Vector } from './matrix';
import { dot, outer, subVectors } from './products';
import { Rational } from './rational';

/** F-M26: the notes' w = +‖x‖e₁, or the stable w = −sign(x₁)‖x‖e₁ that libraries use. */
export type HouseholderSign = 'notes' | 'stable';

export interface ExactReflector {
  precision: { kind: 'exact' };
  x: Vector;
  w: Vector;
  /** v = x − w */
  v: Vector;
  /** P = vvᵀ/‖v‖², the projection onto the span of v. */
  P: Matrix;
  /** H = I − 2P */
  H: Matrix;
}

export interface FloatReflector {
  precision: { kind: 'float'; reason: string };
  x: FloatVector;
  w: FloatVector;
  v: FloatVector;
  P: FloatMatrix;
  H: FloatMatrix;
}

export type Reflector = ExactReflector | FloatReflector;

const TWO = Rational.of(2);

/**
 * F-M26: the reflector that sends x to w. Needs ‖x‖ = ‖w‖ (RangeError
 * otherwise). When x = w, v = 0 and H = I.
 */
export function householder(x: Vector, w: Vector): ExactReflector {
  if (x.length !== w.length) throw new RangeError('householder: x and w must have the same size');
  if (!dot(x, x).equals(dot(w, w))) {
    throw new RangeError('x and w have different lengths, and a reflection keeps lengths: no H sends x to w');
  }
  const n = x.length;
  const v = subVectors(x, w);
  const vv = dot(v, v);
  const P = isZeroVector(v) ? identity(n).map((r) => r.map(() => Rational.ZERO)) : outer(v, v).map((r) => r.map((e) => e.div(vv)));
  const H = identity(n).map((r, i) => r.map((e, j) => e.sub(TWO.mul(P[i][j]))));
  return { precision: { kind: 'exact' }, x, w, v, P, H };
}

export function householderFloat(x: FloatVector, w: FloatVector, reason = 'floating-point input'): FloatReflector {
  if (x.length !== w.length) throw new RangeError('householder: x and w must have the same size');
  const nx = fNorm(x);
  const nw = fNorm(w);
  if (Math.abs(nx - nw) > 1e-12 * Math.max(1, nx)) {
    throw new RangeError('x and w have different lengths, and a reflection keeps lengths: no H sends x to w');
  }
  const v = x.map((xi, i) => xi - w[i]);
  const vv = fDot(v, v);
  const P = v.map((a) => v.map((b) => (vv === 0 ? 0 : (a * b) / vv)));
  const H = fIdentity(x.length).map((r, i) => r.map((e, j) => e - 2 * P[i][j]));
  return { precision: { kind: 'float', reason }, x: [...x], w: [...w], v, P, H };
}

/** ±‖x‖e₁: the notes' + sign, or −sign(x₁) (with sign(0) = +1) for stability. */
function axisTarget<T>(length: T, negate: (t: T) => T, x1Negative: boolean, sign: HouseholderSign): T {
  if (sign === 'notes') return length;
  return x1Negative ? length : negate(length);
}

/** Target w = ±‖x‖e₁; exact when ‖x‖ is rational (F-M25), otherwise floating point with the reason. */
export function householderToAxis(x: Vector, sign: HouseholderSign): Reflector {
  const length = norm(x);
  if (length.kind === 'float') return householderToAxisFloat(x.map((e) => e.toNumber()), sign, length.reason);
  const a = axisTarget(length.value, (t) => t.neg(), x[0]?.isNegative() ?? false, sign);
  return householder(x, x.map((_, i) => (i === 0 ? a : Rational.ZERO)));
}

export function householderToAxisFloat(x: FloatVector, sign: HouseholderSign, reason = 'floating-point input'): FloatReflector {
  const a = axisTarget(fNorm(x), (t) => -t, (x[0] ?? 0) < 0, sign);
  return householderFloat(x, x.map((_, i) => (i === 0 ? a : 0)), reason);
}

/** Hₖ = [[I, 0], [0, Ĥₖ]]: an (m − k) × (m − k) reflector embedded in m × m (L4-QR1). */
export function embedReflector(Hhat: Matrix, m: number): Matrix {
  const k = m - Hhat.length;
  return identity(m).map((r, i) => r.map((e, j) => (i >= k && j >= k ? Hhat[i - k][j - k] : e)));
}

export function embedReflectorFloat(Hhat: FloatMatrix, m: number): FloatMatrix {
  const k = m - Hhat.length;
  return fIdentity(m).map((r, i) => r.map((e, j) => (i >= k && j >= k ? Hhat[i - k][j - k] : e)));
}

export type { Precision };
