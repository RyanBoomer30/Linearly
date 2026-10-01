import { Line } from '@react-three/drei';
import type { Vec3 } from '../types';

interface Line2DProps {
  /** The line a·x + b·y = c. */
  a: number;
  b: number;
  c: number;
  color: string;
  /** Half-width of the region to draw across. */
  extent?: number;
  lineWidth?: number;
  dashed?: boolean;
}

/** F-C3: an equation a·x + b·y = c drawn as a fat line (Line2) across the view. */
export function Line2D({ a, b, c, color, extent = 50, lineWidth = 3, dashed = false }: Line2DProps) {
  let points: [Vec3, Vec3];
  if (Math.abs(b) >= Math.abs(a)) {
    if (Math.abs(b) < 1e-12) return null;
    points = [
      [-extent, (c + a * extent) / b, 0],
      [extent, (c - a * extent) / b, 0],
    ];
  } else {
    points = [
      [(c + b * extent) / a, -extent, 0],
      [(c - b * extent) / a, extent, 0],
    ];
  }
  return <Line points={points} color={color} lineWidth={lineWidth} dashed={dashed} dashSize={0.3} gapSize={0.2} />;
}

/** A line through `point` with direction `dir`, in 2D or 3D (e.g. a solution line). */
export function ParametricLine({
  point,
  dir,
  color,
  extent = 50,
  lineWidth = 4,
}: {
  point: Vec3;
  dir: Vec3;
  color: string;
  extent?: number;
  lineWidth?: number;
}) {
  const len = Math.hypot(...dir);
  if (len < 1e-12) return null;
  const s = extent / len;
  const a: Vec3 = [point[0] - s * dir[0], point[1] - s * dir[1], point[2] - s * dir[2]];
  const b: Vec3 = [point[0] + s * dir[0], point[1] + s * dir[1], point[2] + s * dir[2]];
  return <Line points={[a, b]} color={color} lineWidth={lineWidth} />;
}
