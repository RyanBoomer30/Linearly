import { describe, expect, it } from 'vitest';
import { contourLevels, contourSegments, niceTicks } from '../ticks';

describe('niceTicks (F-C7)', () => {
  it('steps of 1, 2 or 5 × 10ᵏ covering the range', () => {
    expect(niceTicks(0, 8, 5)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(0, 3, 6)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
    expect(niceTicks(-1, 2, 4)).toEqual([-1, 0, 1, 2]);
  });

  it('ticks stay inside [min, max] and are free of float noise', () => {
    const ticks = niceTicks(0.1, 0.7, 6);
    expect(ticks[0]).toBeGreaterThanOrEqual(0.1);
    expect(ticks.at(-1)).toBeLessThanOrEqual(0.7);
    for (const t of ticks) expect(String(t).length).toBeLessThanOrEqual(4);
  });

  it('a zero-width range still gets one tick', () => {
    expect(niceTicks(2, 2)).toEqual([2]);
  });
});

describe('contours (F-C9)', () => {
  // f(x, y) = x² + y² on a 3×3 grid over [−1, 1]².
  const g = [-1, 0, 1];
  const grid = { xs: g, ys: g, values: g.map((y) => g.map((x) => x * x + y * y)), min: 0, max: 2 };

  it('levels lie strictly between min and max', () => {
    const levels = contourLevels(grid, 4);
    expect(levels).toHaveLength(4);
    for (const l of levels) {
      expect(l).toBeGreaterThan(0);
      expect(l).toBeLessThan(2);
    }
  });

  it('the level-1/2 contour of x² + y² surrounds the origin', () => {
    const segs = contourSegments(grid, 0.5);
    expect(segs.length).toBeGreaterThanOrEqual(4);
    for (const [p, q] of segs) {
      for (const pt of [p, q]) {
        expect(Math.hypot(pt[0], pt[1])).toBeGreaterThan(0);
        expect(Math.hypot(pt[0], pt[1])).toBeLessThanOrEqual(1);
        expect(pt[2]).toBe(0);
      }
    }
  });

  it('no segments for a level outside the grid', () => {
    expect(contourSegments(grid, 5)).toEqual([]);
  });
});
