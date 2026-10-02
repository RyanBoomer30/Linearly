import { createContext, useContext } from 'react';
import type { Vec3 } from '../types';

/** One data axis: its range, title and unit, e.g. "Living area, 1000 sq ft" (F-C7). */
export interface AxisSpec {
  min: number;
  max: number;
  title: string;
  unit?: string;
}

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
  const span = (a?: AxisSpec) => (a ? Math.max(a.max - a.min, 1e-9) : 1);
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
  return [(p[0] - frame.x.min) * sx, (p[1] - frame.y.min) * sy, frame.z ? ((p[2] ?? 0) - frame.z.min) * sz : 0];
}

/** Points to frame on load and on Auto-fit (F-C6): the chart's corners plus room for labels. */
export function chartFit(frame: ChartFrame): Vec3[] {
  const far = toWorld(frame, [frame.x.max, frame.y.max, frame.z?.max ?? 0]);
  return [[-1.5, -1.2, 0], [far[0] + 0.5, far[1] + 0.8, far[2]]];
}

/** Inverse of toWorld for the x and y axes (drag handles report scene coordinates). */
export function fromWorld(frame: ChartFrame, p: Vec3): [number, number] {
  const [sx, sy] = axisScales(frame);
  return [frame.x.min + p[0] / sx, frame.y.min + p[1] / sy];
}
