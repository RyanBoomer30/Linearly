import type { FloatGrid } from '../../../core/sampling';
import type { Vec3 } from '../types';

/** F-C7: "nice" tick values (1, 2, 5 × 10ᵏ steps) covering [min, max], about `target` of them. */
export function niceTicks(min: number, max: number, target = 6): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / Math.max(target, 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * magnitude).find((s) => s >= raw - 1e-12)!;
  // Round to the step's decimals so 0.1 + 0.2 shows as 0.3.
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step - 1e-9) * step; t <= max + step * 1e-9; t += step) {
    ticks.push(Number(t.toFixed(decimals)));
  }
  return ticks;
}

/** F-C10: ticks at powers of ten covering [min, max] (both > 0), thinned to about `target` of them. */
export function logTicks(min: number, max: number, target = 8): number[] {
  const lo = Math.ceil(Math.log10(min) - 1e-9);
  const hi = Math.floor(Math.log10(max) + 1e-9);
  if (hi < lo) return [];
  // The smallest step that divides the span, so both ends are labeled, with at most target + 1 ticks.
  const span = hi - lo;
  let step = 1;
  while (step < span && (span % step !== 0 || span / step > target)) step++;
  const ticks: number[] = [];
  for (let e = lo; e <= hi; e += step) ticks.push(Number(`1e${e}`));
  return ticks;
}

/** Evenly spaced contour levels between a grid's min and max (F-C9). */
export function contourLevels(grid: FloatGrid, count = 10): number[] {
  return Array.from({ length: count }, (_, k) => grid.min + ((grid.max - grid.min) * (k + 1)) / (count + 1));
}

/** Marching squares: line segments (data coordinates, z = 0) where the grid crosses `level`. */
export function contourSegments(grid: FloatGrid, level: number): [Vec3, Vec3][] {
  const { xs, ys, values } = grid;
  const segments: [Vec3, Vec3][] = [];
  for (let i = 0; i + 1 < ys.length; i++) {
    for (let j = 0; j + 1 < xs.length; j++) {
      // Corners counter-clockwise from bottom-left; edges between consecutive corners.
      const corners: [number, number, number][] = [
        [xs[j], ys[i], values[i][j]],
        [xs[j + 1], ys[i], values[i][j + 1]],
        [xs[j + 1], ys[i + 1], values[i + 1][j + 1]],
        [xs[j], ys[i + 1], values[i + 1][j]],
      ];
      const crossings: Vec3[] = [];
      for (let k = 0; k < 4; k++) {
        const [x0, y0, v0] = corners[k];
        const [x1, y1, v1] = corners[(k + 1) % 4];
        if (v0 > level === v1 > level) continue;
        const t = (level - v0) / (v1 - v0);
        crossings.push([x0 + t * (x1 - x0), y0 + t * (y1 - y0), 0]);
      }
      // Two crossings make one segment; a saddle (four) is split into two.
      for (let k = 0; k + 1 < crossings.length; k += 2) segments.push([crossings[k], crossings[k + 1]]);
    }
  }
  return segments;
}
