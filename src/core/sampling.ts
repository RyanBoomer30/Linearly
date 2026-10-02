import { notImplemented } from './notImplemented';
import type { ModelSpec } from './regression';

/**
 * F-M15: float evaluation for drawing only. Nothing computed here ever feeds
 * back into a displayed result; exact values come from regression.ts.
 */

/** h(x) in floating point. */
export function evaluateModelFloat(spec: ModelSpec, theta: number[], x: number[]): number {
  return notImplemented('evaluateModelFloat');
}

/** Points (x, h(x)) along [xMin, xMax] for <FunctionPlot>. One feature only. */
export function sampleCurve(spec: ModelSpec, theta: number[], xMin: number, xMax: number, samples = 200): [number, number][] {
  return notImplemented('sampleCurve');
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
  return notImplemented('sampleSurface');
}

/** ‖Y − Xθ‖² in floats; recomputed every frame while θ is dragged (NF-7). */
export function lossFloat(X: number[][], Y: number[], theta: number[]): number {
  return notImplemented('lossFloat');
}

/** Loss over a (θ₀, θ₁) grid for the landscape heatmap (L2-L3, F-C9). */
export function lossGrid(
  X: number[][],
  Y: number[],
  theta0Range: [number, number],
  theta1Range: [number, number],
  resolution = 64,
): FloatGrid {
  return notImplemented('lossGrid');
}
