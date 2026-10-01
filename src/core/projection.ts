import { fromColumns, transpose, zeroVector, type Matrix, type Vector } from './matrix';
import { linearCombination, matMul, matVec, subVectors } from './products';
import { solve } from './solve';
import { columnSpaceBasis, rowSpaceBasis } from './subspaces';

/**
 * Exact orthogonal projections. Every projection onto a span of rational
 * vectors has rational coordinates (normal equations BᵀB c = Bᵀx), so these
 * stay exact. Phase 2 (regression) reuses projectOnto for Y onto C(X).
 */

/** Orthogonal projection of x onto span(basis). basis must be independent; empty basis → 0. */
export function projectOnto(basis: Vector[], x: Vector): Vector {
  if (basis.length === 0) return zeroVector(x.length);
  const B = fromColumns(basis);
  const Bt = transpose(B);
  const coeffs = solve(matMul(Bt, B), matVec(Bt, x));
  if (coeffs.kind !== 'unique') throw new RangeError('projectOnto: basis vectors must be independent');
  return linearCombination(coeffs.x, basis);
}

/** x = x_r + x_n with x_r ∈ C(Aᵀ), x_n ∈ N(A), x_r ⟂ x_n (Strang's big picture, left side). */
export function decomposeRowNull(A: Matrix, x: Vector): { xr: Vector; xn: Vector } {
  const xr = projectOnto(rowSpaceBasis(A), x);
  return { xr, xn: subVectors(x, xr) };
}

/** b = p + e with p ∈ C(A), e ∈ N(Aᵀ), p ⟂ e (right side). */
export function decomposeColumnLeftNull(A: Matrix, b: Vector): { p: Vector; e: Vector } {
  const p = projectOnto(columnSpaceBasis(A), b);
  return { p, e: subVectors(b, p) };
}

/**
 * The unique solution of Ax = b lying in the row space (= A⁺b), or null when
 * b ∉ C(A). Every b in C(A) comes from exactly one x_r in C(Aᵀ).
 */
export function rowSpaceSolution(A: Matrix, b: Vector): Vector | null {
  const sol = solve(A, b);
  if (sol.kind === 'none') return null;
  const x = sol.kind === 'unique' ? sol.x : sol.particular;
  return decomposeRowNull(A, x).xr;
}
