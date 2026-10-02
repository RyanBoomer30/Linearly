import { useMemo } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three';
import type { FloatGrid } from '../../../core/sampling';
import { toWorld, useChartFrame } from './frame';

/** F-C8: a fitted plane or surface y = h(x₁, x₂) over two features (L2-M3), from sampleSurface. */
export function SurfacePlot({ grid, color, opacity = 0.45 }: { grid: FloatGrid; color: string; opacity?: number }) {
  const frame = useChartFrame();
  const geometry = useMemo(() => {
    const { xs, ys, values } = grid;
    const positions = ys.flatMap((y, i) => xs.flatMap((x, j) => toWorld(frame, [x, y, values[i][j]])));
    const index: number[] = [];
    for (let i = 0; i + 1 < ys.length; i++) {
      for (let j = 0; j + 1 < xs.length; j++) {
        const a = i * xs.length + j;
        const b = a + 1;
        const c = a + xs.length;
        const d = c + 1;
        index.push(a, b, d, a, d, c);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, [frame, grid]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} transparent opacity={opacity} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}
