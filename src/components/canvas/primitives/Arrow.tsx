import { useMemo } from 'react';
import { Quaternion, Vector3 } from 'three';
import type { Vec3 } from '../types';

interface ArrowProps {
  from?: Vec3;
  to: Vec3;
  color: string;
  /** Shaft radius in world units. */
  radius?: number;
  headLength?: number;
  opacity?: number;
}

const UP = new Vector3(0, 1, 0);

/** F-C3: thick arrow built from a cylinder shaft and cone head (WebGL ignores lineWidth). */
export function Arrow({ from = [0, 0, 0], to, color, radius = 0.05, headLength = 0.3, opacity = 1 }: ArrowProps) {
  const geom = useMemo(() => {
    const start = new Vector3(...from);
    const dir = new Vector3(...to).sub(start);
    const length = dir.length();
    if (length < 1e-9) return null;
    const head = Math.min(headLength, length * 0.5);
    const shaft = length - head;
    const unit = dir.clone().normalize();
    const quaternion = new Quaternion().setFromUnitVectors(UP, unit);
    const shaftCenter = start.clone().addScaledVector(unit, shaft / 2);
    const headCenter = start.clone().addScaledVector(unit, shaft + head / 2);
    return { quaternion, shaft, head, shaftCenter, headCenter };
  }, [from[0], from[1], from[2], to[0], to[1], to[2], headLength]);

  if (!geom) return null;
  const transparent = opacity < 1;

  return (
    <group>
      <mesh position={geom.shaftCenter} quaternion={geom.quaternion}>
        <cylinderGeometry args={[radius, radius, geom.shaft, 16]} />
        <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={geom.headCenter} quaternion={geom.quaternion}>
        <coneGeometry args={[radius * 2.6, geom.head, 24]} />
        <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
      </mesh>
    </group>
  );
}
