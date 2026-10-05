import type { Complex } from './complex';
import type { AnyMatrix, AnyVector, Precision } from './float';
import type { Matrix } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';
import type { VectorScaling } from './scaling';

/**
 * F-M34: an eigenvalue with its algebraic multiplicity. Rational roots are
 * exact; irrational real roots and complex roots are floating point.
 */
export type Eigenvalue =
  | { kind: 'rational'; value: Rational; multiplicity: number }
  | { kind: 'real'; value: number; multiplicity: number }
  | { kind: 'complex'; value: Complex; multiplicity: number };

/**
 * F-M33: coefficients of the characteristic polynomial det(λI − A), highest
 * power first and monic, so for n = 3: [1, c₂, c₁, c₀] means
 * λ³ + c₂λ² + c₁λ + c₀. (det(A − λI) is (−1)ⁿ times this.) n ≤ 4.
 */
export function characteristicPolynomial(A: Matrix): Rational[] {
  return notImplemented('characteristicPolynomial');
}

/** "\\lambda^3 - \\frac{17}{10}\\lambda^2 + \\frac{4}{5}\\lambda - \\frac{1}{10}" */
export function polynomialTex(coefficients: Rational[], variable = '\\lambda'): string {
  return notImplemented('polynomialTex');
}

/**
 * F-M34: the distinct eigenvalues of A (n ≤ 4) with multiplicities, ordered by
 * |λ| descending (ties: real before complex, positive before negative, then
 * the complex one with positive imaginary part first). Rational roots by the
 * rational root test on the integer-scaled polynomial; the rest by
 * Durand–Kerner (or Aberth) iteration. Complex roots come in conjugate pairs.
 */
export function eigenvalues(A: Matrix): Eigenvalue[] {
  return notImplemented('eigenvalues');
}

/** λ as a float (the real part for a complex λ). */
export function eigenvalueNumber(lambda: Eigenvalue): number {
  return notImplemented('eigenvalueNumber');
}

/** |λ| as a float. */
export function eigenvalueAbs(lambda: Eigenvalue): number {
  return notImplemented('eigenvalueAbs');
}

/** TeX for λ: "1", "\\frac{1}{2}", "0.6180", "-0.5 + 0.866i". */
export function eigenvalueTex(lambda: Eigenvalue, significant = 4): string {
  return notImplemented('eigenvalueTex');
}

export interface Eigenpair {
  eigenvalue: Eigenvalue;
  /**
   * F-M35: a basis of N(A − λI). Exact (the Lesson 1 null space) for a
   * rational λ; the smallest right singular vector(s) of A − λI for an
   * irrational real λ; empty for a complex λ (non-goal).
   */
  vectors: AnyVector[];
  precision: Precision;
}

/** F-M35: the eigenvectors for one eigenvalue, scaled as asked (F-M37). */
export function eigenvectors(A: Matrix, lambda: Eigenvalue, scaling: VectorScaling = 'integer'): Eigenpair {
  return notImplemented('eigenvectors');
}

/** Every eigenvalue with its eigenvectors, in eigenvalues() order. */
export function eigenpairs(A: Matrix, scaling: VectorScaling = 'integer'): Eigenpair[] {
  return notImplemented('eigenpairs');
}

export type Diagonalization =
  | {
      kind: 'diagonalizable';
      precision: Precision;
      /** One per column of V: each eigenvalue repeated by its multiplicity, in eigenvalues() order. */
      eigenvalues: Eigenvalue[];
      V: AnyMatrix;
      Lambda: AnyMatrix;
      Vinv: AnyMatrix;
    }
  /** An eigenvalue has fewer independent eigenvectors than its multiplicity, so V is not invertible (L5-EG5). */
  | { kind: 'defective'; eigenvalue: Eigenvalue; algebraic: number; geometric: number; reason: string }
  /** Complex eigenvalues: A is diagonalizable only over ℂ, which the tool does not show. */
  | { kind: 'complex'; eigenvalues: Eigenvalue[]; reason: string };

/**
 * F-M36: A = VΛV⁻¹, exact when every eigenvalue is rational. Eigenvectors are
 * scaled as asked (F-M37); "probability" applies to λ = 1 only, the others
 * stay "integer".
 */
export function diagonalize(A: Matrix, scaling: VectorScaling = 'integer'): Diagonalization {
  return notImplemented('diagonalize');
}
