import { notImplemented } from '../../../core/notImplemented';
import type { Vec3 } from '../types';

/**
 * F-C11: the probability vectors with n entries form a simplex — a segment
 * (n = 2), an equilateral triangle (n = 3, drawn in 2D) or a regular
 * tetrahedron (n = 4, drawn in 3D). Vertex i is the pure state e_i.
 */
export function simplexVertices(n: 2 | 3 | 4): Vec3[] {
  return notImplemented('simplexVertices');
}

/** A probability vector → scene point: Σ pᵢ · vertexᵢ (barycentric coordinates). */
export function barycentricToWorld(p: readonly number[]): Vec3 {
  return notImplemented('barycentricToWorld');
}

/**
 * Scene point → probability vector, for the draggable point: the nearest
 * point of the simplex, so the point stays inside and the entries are ≥ 0 and
 * sum to 1.
 */
export function worldToBarycentric(point: Vec3, n: 2 | 3 | 4): number[] {
  return notImplemented('worldToBarycentric');
}
