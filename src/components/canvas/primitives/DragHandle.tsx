import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import { Plane, Ray, Vector3 } from 'three';
import { Point } from './Point';
import type { Vec3 } from '../types';

interface DragHandleProps {
  position: Vec3;
  color: string;
  onDrag: (next: Vec3) => void;
  /** Snap to the integer lattice while dragging. */
  snap?: boolean;
  /** Restrict dragging to the z = 0 plane (2D canvases). */
  planar?: boolean;
}

type Controls = { enabled: boolean } | null;

/**
 * F-C4: draggable handle on a point or vector tip. The point moves in the
 * z = 0 plane (planar) or in the plane through it facing the camera. Orbit
 * controls are paused while dragging.
 */
export function DragHandle({ position, color, onDrag, snap = false, planar = false }: DragHandleProps) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as Controls;
  const drag = useRef<{ normal: Vec3; point: Vec3 } | null>(null);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const normal: Vec3 = planar ? [0, 0, 1] : (camera.getWorldDirection(new Vector3()).toArray() as Vec3);
    drag.current = { normal, point: position };
    if (controls) controls.enabled = false;
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    const ray = { origin: e.ray.origin.toArray() as Vec3, direction: e.ray.direction.toArray() as Vec3 };
    const next = projectDrag(ray, drag.current.normal, drag.current.point, snap);
    if (next) onDrag(next);
  };

  const end = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
    if (controls) controls.enabled = true;
  };

  return (
    <group onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={end}>
      <Point position={position} color={color} radius={0.16} />
    </group>
  );
}

/** Project a pointer ray onto the drag plane and optionally snap. Null when the ray is parallel to the plane. */
export function projectDrag(
  ray: { origin: Vec3; direction: Vec3 },
  planeNormal: Vec3,
  planePoint: Vec3,
  snap: boolean,
): Vec3 | null {
  const plane = new Plane().setFromNormalAndCoplanarPoint(new Vector3(...planeNormal).normalize(), new Vector3(...planePoint));
  const hit = new Ray(new Vector3(...ray.origin), new Vector3(...ray.direction)).intersectPlane(plane, new Vector3());
  if (!hit) return null;
  const p = hit.toArray() as Vec3;
  return snap ? (p.map(Math.round) as Vec3) : p;
}
