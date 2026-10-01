import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import type { Vec3 } from '../types';

/** Integer grid on the z = 0 plane. */
export function GridLines({ extent, color }: { extent: number; color: string }) {
  const points = useMemo(() => {
    const pts: Vec3[] = [];
    for (let k = -extent; k <= extent; k++) {
      pts.push([k, -extent, 0], [k, extent, 0], [-extent, k, 0], [extent, k, 0]);
    }
    return pts;
  }, [extent]);
  return <Line points={points} segments color={color} lineWidth={1} />;
}
