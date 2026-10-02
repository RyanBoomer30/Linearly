import { notImplemented } from '../../../core/notImplemented';
import type { FloatGrid } from '../../../core/sampling';
import type { Vec3 } from '../types';

/** F-C7: "nice" tick values (1, 2, 5 × 10ᵏ steps) covering [min, max], about `target` of them. */
export function niceTicks(min: number, max: number, target = 6): number[] {
  return notImplemented('niceTicks');
}

/** Evenly spaced contour levels between a grid's min and max (F-C9). */
export function contourLevels(grid: FloatGrid, count = 10): number[] {
  return notImplemented('contourLevels');
}

/** Marching squares: line segments (data coordinates, z = 0) where the grid crosses `level`. */
export function contourSegments(grid: FloatGrid, level: number): [Vec3, Vec3][] {
  return notImplemented('contourSegments');
}
