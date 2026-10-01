import { notImplemented } from '../../../core/notImplemented';
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

/**
 * F-C4: draggable handle on a point or vector tip.
 * TODO: pointer capture, ray–plane intersection for the drag, snapping,
 * and disabling OrbitControls while dragging.
 */
export function DragHandle({ position, color }: DragHandleProps) {
  return <Point position={position} color={color} radius={0.16} />;
}

/** Project a pointer ray onto the drag plane and optionally snap. */
export function projectDrag(ray: { origin: Vec3; direction: Vec3 }, planeNormal: Vec3, planePoint: Vec3, snap: boolean): Vec3 {
  return notImplemented('projectDrag');
}
