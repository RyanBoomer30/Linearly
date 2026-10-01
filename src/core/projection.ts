import { notImplemented } from './notImplemented';
import type { Matrix, Vector } from './matrix';

/**
 * Exact orthogonal projections. Every projection onto a span of rational
 * vectors has rational coordinates (normal equations BᵀB c = Bᵀx), so these
 * stay exact. Phase 2 (regression) reuses projectOnto for Y onto C(X).
 */

/** Orthogonal projection of x onto span(basis). basis must be independent; empty basis → 0. */
export function projectOnto(basis: Vector[], x: Vector): Vector {
  return notImplemented('projectOnto');
}

/** x = x_r + x_n with x_r ∈ C(Aᵀ), x_n ∈ N(A), x_r ⟂ x_n (Strang's big picture, left side). */
export function decomposeRowNull(A: Matrix, x: Vector): { xr: Vector; xn: Vector } {
  return notImplemented('decomposeRowNull');
}

/** b = p + e with p ∈ C(A), e ∈ N(Aᵀ), p ⟂ e (right side). */
export function decomposeColumnLeftNull(A: Matrix, b: Vector): { p: Vector; e: Vector } {
  return notImplemented('decomposeColumnLeftNull');
}

/**
 * The unique solution of Ax = b lying in the row space (= A⁺b), or null when
 * b ∉ C(A). Every b in C(A) comes from exactly one x_r in C(Aᵀ).
 */
export function rowSpaceSolution(A: Matrix, b: Vector): Vector | null {
  return notImplemented('rowSpaceSolution');
}
