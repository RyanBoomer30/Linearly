import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, type MutableRefObject } from 'react';
import { Box3, OrthographicCamera, PerspectiveCamera, Sphere, Vector3 } from 'three';
import type { Vec3 } from '../types';

/** Axis-aligned bounds of everything visible, used to frame the camera (F-C6). */
export function boundsOf(points: Vec3[]): { min: Vec3; max: Vec3 } {
  const box = new Box3().setFromPoints(points.map((p) => new Vector3(...p)));
  if (box.isEmpty()) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min: box.min.toArray() as Vec3, max: box.max.toArray() as Vec3 };
}

type Controls = { target: Vector3; update: () => void } | null;

/**
 * F-C6: returns a `fit()` callback that frames the given points (and the
 * origin). Must be used inside a Canvas. Call it on load and from an
 * "Auto-fit" button — never automatically on matrix edits (§6).
 */
export function useAutoFit(points: Vec3[], margin = 1.3): { fit: () => void } {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as Controls;
  const key = JSON.stringify(points);

  const fit = useCallback(() => {
    const { min, max } = boundsOf([[0, 0, 0], ...points]);
    const sphere = new Box3(new Vector3(...min), new Vector3(...max)).getBoundingSphere(new Sphere());
    // A floor keeps small scenes (a solution near the origin) from zooming in on huge planes.
    const radius = Math.max(sphere.radius, 4) * margin;
    const center = sphere.center;

    if (camera instanceof OrthographicCamera) {
      camera.position.set(center.x, center.y, camera.position.z);
      camera.zoom = Math.min(size.width, size.height) / (2 * radius);
    } else if (camera instanceof PerspectiveCamera) {
      const dir = camera.position.clone().sub(controls?.target ?? new Vector3()).normalize();
      const dist = radius / Math.sin((camera.fov * Math.PI) / 360);
      camera.position.copy(center.clone().addScaledVector(dir, dist));
    }
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, controls, size.width, size.height, key, margin]);

  return { fit };
}

/**
 * Lives inside a Canvas: frames `points` once on load (the default from §6),
 * saves that as the Reset view, and hands `fit` out through `fitRef` for an
 * Auto-fit button outside the Canvas. Later edits never move the camera.
 */
export function FitBridge({ points, fitRef }: { points: Vec3[]; fitRef: MutableRefObject<(() => void) | null> }) {
  const { fit } = useAutoFit(points);
  const controls = useThree((s) => s.controls) as unknown as { saveState?: () => void } | null;
  fitRef.current = fit;
  useEffect(() => {
    if (!controls) return;
    fit();
    controls.saveState?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);
  return null;
}
