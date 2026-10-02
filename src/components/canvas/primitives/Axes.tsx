import { Line } from '@react-three/drei';
import { Label } from './Label';
import type { Vec3 } from '../types';

interface AxesProps {
  extent: number;
  dims: 2 | 3;
  color: string;
  labelColor: string;
  /** Axis names; defaults to x₁, x₂, x₃. */
  names?: string[];
}

const AXES: { name: string; dir: Vec3 }[] = [
  { name: 'x₁', dir: [1, 0, 0] },
  { name: 'x₂', dir: [0, 1, 0] },
  { name: 'x₃', dir: [0, 0, 1] },
];

export function Axes({ extent, dims, color, labelColor, names }: AxesProps) {
  return (
    <group>
      {AXES.slice(0, dims).map(({ name: fallback, dir }, k) => {
        const name = names?.[k] ?? fallback;
        const end = dir.map((d) => d * extent) as Vec3;
        const start = dir.map((d) => -d * extent) as Vec3;
        const labelAt = dir.map((d) => d * (extent + 0.5)) as Vec3;
        return (
          <group key={name}>
            <Line points={[start, end]} color={color} lineWidth={2} />
            <Label position={labelAt} color={labelColor}>
              {name}
            </Label>
          </group>
        );
      })}
    </group>
  );
}
