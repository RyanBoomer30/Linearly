import { notImplemented } from '../../../core/notImplemented';
import type { Vec3 } from '../types';

/** Axis-aligned bounds of everything visible, used to frame the camera (F-C6). */
export function boundsOf(points: Vec3[]): { min: Vec3; max: Vec3 } {
  return notImplemented('boundsOf');
}

/**
 * F-C6: returns a `fit()` callback that frames the given points. Called on
 * load and from an "Auto-fit" button — never automatically on matrix edits (§6).
 * TODO: implement with useThree() camera + controls.
 */
export function useAutoFit(points: Vec3[]): { fit: () => void } {
  return { fit: () => notImplemented('useAutoFit.fit') };
}
