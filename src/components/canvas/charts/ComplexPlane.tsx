import { Line } from '@react-three/drei';
import type { Complex } from '../../../core/complex';
import { useSceneColors } from '../../../theme/useTheme';
import { Canvas2D } from '../Canvas2D';
import { Label } from '../primitives/Label';
import { Point } from '../primitives/Point';
import type { Vec3 } from '../types';

export interface ComplexPoint {
  z: Complex;
  color: string;
  label?: string;
  /** L5-PF1: λ₁ = 1 drawn larger. */
  highlighted?: boolean;
}

export interface ComplexCircle {
  radius: number;
  color: string;
  label?: string;
  dashed?: boolean;
}

/** Points of a circle of the given radius, for drawing. */
const circle = (r: number, segments = 128): Vec3[] =>
  Array.from({ length: segments + 1 }, (_, k) => {
    const a = (2 * Math.PI * k) / segments;
    return [r * Math.cos(a), r * Math.sin(a), 0];
  });

/** Scene units per unit of the complex plane: the unit circle spans ±SCALE. */
const SCALE = 3;

/**
 * F-C12: the complex plane with the unit circle, points for eigenvalues, and
 * circles of a given radius (e.g. |λ₂|, the convergence rate).
 */
export function ComplexPlane({ points, circles = [] }: { points: ComplexPoint[]; circles?: ComplexCircle[] }) {
  const colors = useSceneColors();
  const at = (z: Complex): Vec3 => [z.re * SCALE, z.im * SCALE, 0];
  return (
    <Canvas2D extent={5} zoom={45} axisNames={['Re', 'Im']} fit={[[-SCALE - 0.6, -SCALE - 0.6, 0], [SCALE + 0.6, SCALE + 0.6, 0]]}>
      <Line points={circle(SCALE)} color={colors.axis} lineWidth={2} />
      <Label position={[SCALE * 0.72, SCALE * 0.72 + 0.3, 0]} color={colors.text}>
        |λ| = 1
      </Label>
      {circles.map((c, k) => (
        <group key={k}>
          <Line points={circle(c.radius * SCALE)} color={c.color} lineWidth={2} dashed={c.dashed} dashSize={0.15} gapSize={0.1} />
          {c.label && (
            <Label position={[-c.radius * SCALE * 0.72 - 0.4, c.radius * SCALE * 0.72 + 0.2, 0]} color={c.color}>
              {c.label}
            </Label>
          )}
        </group>
      ))}
      {points.map((p, k) => (
        <group key={k}>
          <Point position={at(p.z)} color={p.color} radius={p.highlighted ? 0.16 : 0.11} />
          {p.label && (
            <Label position={[at(p.z)[0] + 0.15, at(p.z)[1] + (k % 2 === 0 ? 0.35 : -0.45), 0]} color={p.color}>
              {p.label}
            </Label>
          )}
        </group>
      ))}
    </Canvas2D>
  );
}
