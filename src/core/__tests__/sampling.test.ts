import { describe, expect, it } from 'vitest';
import type { ModelSpec } from '../regression';
import { evaluateModelFloat, lossFloat, lossGrid, sampleCurve, sampleSurface } from '../sampling';

const LINE: ModelSpec = { terms: [{ kind: 'intercept' }, { kind: 'monomial', powers: [1] }] };
const QUAD: ModelSpec = { terms: [{ kind: 'intercept' }, { kind: 'monomial', powers: [1] }, { kind: 'monomial', powers: [2] }] };
const PLANE: ModelSpec = { terms: [{ kind: 'intercept' }, { kind: 'monomial', powers: [1, 0] }, { kind: 'monomial', powers: [0, 1] }] };

/** Houses, line model (F-M15 is floats only). */
const X = [
  [1, 1],
  [1, 2.25],
  [1, 1.5],
];
const Y = [4, 6, 5];
const STAR = [5 / 2, 30 / 19];

describe('evaluateModelFloat', () => {
  it('quadratic from the notes: y = −0.15 − 0.45x + 0.75x²', () => {
    expect(evaluateModelFloat(QUAD, [-0.15, -0.45, 0.75], [2])).toBeCloseTo(1.95, 12);
  });

  it('two features', () => {
    expect(evaluateModelFloat(PLANE, [13 / 5, 26 / 15, -1 / 10], [1, 2])).toBeCloseTo(13 / 5 + 26 / 15 - 2 / 10, 12);
  });
});

describe('sampleCurve', () => {
  it('covers [xMin, xMax] with the requested number of samples', () => {
    const pts = sampleCurve(LINE, STAR, 0, 3, 50);
    expect(pts).toHaveLength(50);
    expect(pts[0][0]).toBe(0);
    expect(pts[49][0]).toBe(3);
    for (const [x, y] of pts) expect(y).toBeCloseTo(STAR[0] + STAR[1] * x, 12);
  });
});

describe('sampleSurface', () => {
  it('values[i][j] = h(xs[j], ys[i]), with min and max', () => {
    const g = sampleSurface(PLANE, [1, 2, 3], [0, 1], [0, 2], 5);
    expect(g.xs).toHaveLength(5);
    expect(g.ys).toHaveLength(5);
    expect(g.values[4][4]).toBeCloseTo(1 + 2 * 1 + 3 * 2, 12);
    expect(g.min).toBeCloseTo(1, 12);
    expect(g.max).toBeCloseTo(9, 12);
  });
});

describe('lossFloat', () => {
  it('at θ*: ‖e‖² = 3/114', () => {
    expect(lossFloat(X, Y, STAR)).toBeCloseTo(3 / 114, 12);
  });

  it('at the notes\' rounded θ = (2.5, 1.58): 3 × 0.008775', () => {
    expect(lossFloat(X, Y, [2.5, 1.58])).toBeCloseTo(3 * 0.008775, 12);
  });
});

describe('lossGrid (L2-L3)', () => {
  it('a grid over (θ₀, θ₁) whose smallest value is near θ*', () => {
    const g = lossGrid(X, Y, [0, 5], [0, 3], 41);
    expect(g.values).toHaveLength(41);
    expect(g.values[0]).toHaveLength(41);
    let best = [0, 0];
    g.values.forEach((row, i) => row.forEach((v, j) => v < g.values[best[0]][best[1]] && (best = [i, j])));
    expect(Math.abs(g.xs[best[1]] - STAR[0])).toBeLessThanOrEqual(5 / 40);
    expect(Math.abs(g.ys[best[0]] - STAR[1])).toBeLessThanOrEqual(3 / 40);
    expect(g.min).toBeGreaterThanOrEqual(3 / 114 - 1e-12);
  });
});
