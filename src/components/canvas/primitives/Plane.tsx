import { useMemo } from 'react';
import { DoubleSide, Matrix4, Quaternion, Vector3 } from 'three';
import type { Vec3 } from '../types';

type PlaneSpec =
  /** n · x = offset */
  | { normal: Vec3; offset: number; spanning?: never; point?: never }
  /** point + s·u + t·v */
  | { spanning: [Vec3, Vec3]; point?: Vec3; normal?: never; offset?: never };

type PlaneProps = PlaneSpec & {
  color: string;
  opacity?: number;
  /** Side length of the drawn square. */
  size?: number;
  renderOrder?: number;
};

/**
 * F-C3 / F-C5: semi-transparent plane. depthWrite is off so overlapping
 * planes stay visible through each other; pass distinct renderOrder values
 * for stable sorting when several planes overlap.
 */
export function Plane(props: PlaneProps) {
  const { color, opacity = 0.35, size = 12, renderOrder = 0 } = props;

  const pose = useMemo(() => {
    let n: Vector3;
    let center: Vector3;
    if (props.spanning) {
      const [u, v] = props.spanning;
      n = new Vector3(...u).cross(new Vector3(...v));
      center = new Vector3(...(props.point ?? [0, 0, 0]));
    } else {
      n = new Vector3(...props.normal);
      const len2 = n.lengthSq();
      center = len2 > 0 ? n.clone().multiplyScalar(props.offset / len2) : new Vector3();
    }
    if (n.lengthSq() < 1e-18) return null;
    n.normalize();
    // Any vector not parallel to n gives an in-plane basis e1, e2.
    const helper = Math.abs(n.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
    const e1 = new Vector3().crossVectors(helper, n).normalize();
    const e2 = new Vector3().crossVectors(n, e1);
    const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(e1, e2, n));
    return { center, quaternion };
  }, [JSON.stringify(props.spanning ?? props.normal), props.offset, JSON.stringify(props.point)]);

  if (!pose) return null;

  return (
    <mesh position={pose.center} quaternion={pose.quaternion} renderOrder={renderOrder}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}
