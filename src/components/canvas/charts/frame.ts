import { createContext, useContext } from 'react';
import type { Vec3 } from '../types';

/** One data axis: its range, title and unit, e.g. "Living area, 1000 sq ft" (F-C7). */
export interface AxisSpec {
  /** Data range; for a log axis, the range of the values themselves (e.g. 1e-16 … 1). */
  min: number;
  max: number;
  title: string;
  unit?: string;
  /** F-C10: powers of ten along this axis. */
  log?: boolean;
}

/** Position along an axis in "axis units": the value, or log₁₀ of it on a log axis. */
export const axisValue = (a: AxisSpec | undefined, v: number) => (a?.log ? Math.log10(v) : v);

/**
 * Data coordinates → scene coordinates. Each axis maps [min, max] onto
 * [0, size] world units, so x and y scales are independent unless
 * `equalAspect` is set (needed for honest residual squares, L2-L1).
 */
export interface ChartFrame {
  x: AxisSpec;
  y: AxisSpec;
  /** 3D charts only. */
  z?: AxisSpec;
  size: number;
  equalAspect: boolean;
}

export const ChartFrameContext = createContext<ChartFrame | null>(null);

export function useChartFrame(): ChartFrame {
  const frame = useContext(ChartFrameContext);
  if (!frame) throw new Error('Chart primitives must be placed inside <Axes2D> or <Axes3D>');
  return frame;
}

/** World units per data unit along each axis. */
export function axisScales(frame: ChartFrame): Vec3 {
  const span = (a?: AxisSpec) => (a ? Math.max(axisValue(a, a.max) - axisValue(a, a.min), 1e-9) : 1);
  const spans = [span(frame.x), span(frame.y), span(frame.z)];
  if (frame.equalAspect) {
    const s = frame.size / Math.max(...spans.slice(0, frame.z ? 3 : 2));
    return [s, s, s];
  }
  return spans.map((d) => frame.size / d) as Vec3;
}

/** Map a data point (x, y[, z]) into the scene. */
export function toWorld(frame: ChartFrame, p: readonly number[]): Vec3 {
  const [sx, sy, sz] = axisScales(frame);
  const along = (a: AxisSpec, v: number) => axisValue(a, v) - axisValue(a, a.min);
  return [along(frame.x, p[0]) * sx, along(frame.y, p[1]) * sy, frame.z ? along(frame.z, p[2] ?? 0) * sz : 0];
}

/** Points to frame on load and on Auto-fit (F-C6): the chart's corners plus room for labels. */
export function chartFit(frame: ChartFrame): Vec3[] {
  const far = toWorld(frame, [frame.x.max, frame.y.max, frame.z?.max ?? 0]);
  return [[-1.5, -1.2, 0], [far[0] + 0.5, far[1] + 0.8, far[2]]];
}

/** Inverse of toWorld for the x and y axes (drag handles report scene coordinates). */
export function fromWorld(frame: ChartFrame, p: Vec3): [number, number] {
  const [sx, sy] = axisScales(frame);
  const back = (a: AxisSpec, t: number) => {
    const u = axisValue(a, a.min) + t;
    return a.log ? 10 ** u : u;
  };
  return [back(frame.x, p[0] / sx), back(frame.y, p[1] / sy)];
}
