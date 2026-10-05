import { FunctionPlot } from './FunctionPlot';
import { Segment } from './Segment';

type Point = [number, number];

/**
 * F-C14: the covariance ellipse of 2D data — axes along v₁ and v₂ with half
 * lengths proportional to √λ₁ and √λ₂ — drawn in data coordinates inside
 * <Axes2D>, with its two axes.
 */
export function Ellipse({ center, axes, color, segments = 96 }: { center: Point; axes: { dir: Point; length: number }[]; color: string; segments?: number }) {
  const [a, b] = axes;
  if (!a || !b) return null;
  const points: Point[] = Array.from({ length: segments + 1 }, (_, k) => {
    const t = (2 * Math.PI * k) / segments;
    const c = Math.cos(t) * a.length;
    const s = Math.sin(t) * b.length;
    return [center[0] + c * a.dir[0] + s * b.dir[0], center[1] + c * a.dir[1] + s * b.dir[1]];
  });
  return (
    <>
      <FunctionPlot points={points} color={color} lineWidth={2} dashed />
      {axes.map((ax, i) => (
        <Segment
          key={i}
          from={[center[0] - ax.dir[0] * ax.length, center[1] - ax.dir[1] * ax.length]}
          to={[center[0] + ax.dir[0] * ax.length, center[1] + ax.dir[1] * ax.length]}
          color={color}
          lineWidth={1}
        />
      ))}
    </>
  );
}
