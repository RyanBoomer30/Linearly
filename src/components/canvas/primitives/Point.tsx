import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '../types';

interface PointProps {
  position: Vec3;
  color: string;
  radius?: number;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}

/** F-C3 */
export function Point({ position, color, radius = 0.12, onPointerDown }: PointProps) {
  return (
    <mesh position={position} onPointerDown={onPointerDown}>
      <sphereGeometry args={[radius, 24, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
