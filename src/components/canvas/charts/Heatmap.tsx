import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { Color, DataTexture, RGBAFormat } from 'three';
import type { FloatGrid } from '../../../core/sampling';
import { attempt } from '../../../store/useSystem';
import { Point } from '../primitives/Point';
import type { Vec3 } from '../types';
import { ChartDragHandle } from './ChartDragHandle';
import { toWorld, useChartFrame } from './frame';
import { contourLevels, contourSegments } from './ticks';

interface HeatmapProps {
  /** Values over (x, y) = (θ₀, θ₁), e.g. from lossGrid (F-M15). */
  grid: FloatGrid;
  low?: string;
  high?: string;
  contourColor?: string;
  /** Draggable marker (the current θ), in data coordinates. */
  marker?: [number, number];
  markerColor?: string;
  onMarkerDrag?: (next: [number, number]) => void;
  /** Fixed marker (θ*, the bottom of the bowl). */
  minimum?: [number, number];
  minimumColor?: string;
}

/** F-C9: a function of two variables as colors with contour lines, plus a draggable marker. */
export function Heatmap({
  grid,
  low = '#f7fbff',
  high = '#08306b',
  contourColor = '#52525b',
  marker,
  markerColor = '#D55E00',
  onMarkerDrag,
  minimum,
  minimumColor = '#009E73',
}: HeatmapProps) {
  const frame = useChartFrame();
  const { xs, ys, values, min, max } = grid;

  const texture = useMemo(() => {
    const a = new Color(low);
    const b = new Color(high);
    const data = new Uint8Array(xs.length * ys.length * 4);
    values.forEach((row, i) =>
      row.forEach((v, j) => {
        // sqrt spreads out the colors near the minimum of a quadratic bowl.
        const t = max > min ? Math.sqrt((v - min) / (max - min)) : 0;
        const c = a.clone().lerp(b, t);
        data.set([c.r * 255, c.g * 255, c.b * 255, 255], (i * xs.length + j) * 4);
      }),
    );
    const tex = new DataTexture(data, xs.length, ys.length, RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, [xs, ys, values, min, max, low, high]);

  const contours = useMemo(() => {
    const levels = attempt(() => contourLevels(grid));
    if (!levels.ok) return [];
    return levels.value.flatMap((level) => {
      const segs = attempt(() => contourSegments(grid, level));
      return segs.ok ? segs.value.flatMap(([p, q]) => [toWorld(frame, p), toWorld(frame, q)]) : [];
    });
  }, [grid, frame]);

  const lo = toWorld(frame, [xs[0], ys[0]]);
  const hi = toWorld(frame, [xs[xs.length - 1], ys[ys.length - 1]]);
  const center: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, -0.01];

  return (
    <>
      <mesh position={center}>
        <planeGeometry args={[hi[0] - lo[0], hi[1] - lo[1]]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {contours.length > 0 && <Line points={contours} segments color={contourColor} lineWidth={1} />}
      {minimum && <Point position={toWorld(frame, minimum)} color={minimumColor} radius={0.1} />}
      {marker && (
        <ChartDragHandle at={marker} color={markerColor} onDrag={(p) => onMarkerDrag?.(p)} />
      )}
    </>
  );
}
