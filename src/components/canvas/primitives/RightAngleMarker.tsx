import { Line } from '@react-three/drei';
import type { Vec3 } from '../types';

/** Small square at the origin between two perpendicular directions u and v. */
export function RightAngleMarker({ u, v, size = 0.4, color }: { u: Vec3; v: Vec3; size?: number; color: string }) {
  const unit = (w: Vec3): Vec3 => {
    const len = Math.hypot(...w) || 1;
    return w.map((c) => (c / len) * size) as Vec3;
  };
  const a = unit(u);
  const b = unit(v);
  const corner: Vec3 = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  return <Line points={[a, corner, b]} color={color} lineWidth={2} />;
}
