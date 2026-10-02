import type { ModelSpec, ModelTerm } from './regression';

const termFloat = (t: ModelTerm, x: number[]) =>
  t.kind === 'intercept' ? 1 : t.powers.reduce((acc, p, k) => acc * x[k] ** p, 1);

/** n evenly spaced values from a to b, hitting both ends exactly. */
const linspace = (a: number, b: number, n: number) =>
  Array.from({ length: n }, (_, i) => (n === 1 ? a : i === n - 1 ? b : a + ((b - a) * i) / (n - 1)));

function gridOf(xs: number[], ys: number[], f: (x: number, y: number) => number): FloatGrid {
  const values = ys.map((y) => xs.map((x) => f(x, y)));
  const flat = values.flat();
  return { xs, ys, values, min: Math.min(...flat), max: Math.max(...flat) };
}

/**
 * F-M15: float evaluation for drawing only. Nothing computed here ever feeds
 * back into a displayed result; exact values come from regression.ts.
 */

/** h(x) in floating point. */
export function evaluateModelFloat(spec: ModelSpec, theta: number[], x: number[]): number {
  return spec.terms.reduce((sum, t, j) => sum + theta[j] * termFloat(t, x), 0);
}

/** Points (x, h(x)) along [xMin, xMax] for <FunctionPlot>. One feature only. */
export function sampleCurve(spec: ModelSpec, theta: number[], xMin: number, xMax: number, samples = 200): [number, number][] {
  return linspace(xMin, xMax, samples).map((x) => [x, evaluateModelFloat(spec, theta, [x])]);
}

/** A regular grid of values over a rectangle: values[i][j] at (xs[j], ys[i]). */
export interface FloatGrid {
  xs: number[];
  ys: number[];
  values: number[][];
  min: number;
  max: number;
}

/** h(x₁, x₂) over a grid, for <SurfacePlot> (L2-M3). */
export function sampleSurface(
  spec: ModelSpec,
  theta: number[],
  x1Range: [number, number],
  x2Range: [number, number],
  resolution = 24,
): FloatGrid {
  return gridOf(linspace(...x1Range, resolution), linspace(...x2Range, resolution), (x1, x2) =>
    evaluateModelFloat(spec, theta, [x1, x2]),
  );
}

/** ‖Y − Xθ‖² in floats; recomputed every frame while θ is dragged (NF-7). */
export function lossFloat(X: number[][], Y: number[], theta: number[]): number {
  return X.reduce((sum, row, i) => {
    const r = Y[i] - row.reduce((s, x, j) => s + x * theta[j], 0);
    return sum + r * r;
  }, 0);
}

/** Loss over a (θ₀, θ₁) grid for the landscape heatmap (L2-L3, F-C9). */
export function lossGrid(
  X: number[][],
  Y: number[],
  theta0Range: [number, number],
  theta1Range: [number, number],
  resolution = 64,
): FloatGrid {
  return gridOf(linspace(...theta0Range, resolution), linspace(...theta1Range, resolution), (t0, t1) =>
    lossFloat(X, Y, [t0, t1]),
  );
}
