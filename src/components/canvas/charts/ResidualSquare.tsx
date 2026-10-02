import { useMemo } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three';
import { toWorld, useChartFrame } from './frame';

/**
 * F-C8: a square whose area is the squared error. One side is the vertical
 * residual from (x, y) to (x, h(x)); the square extends to the right. Only
 * honest when the frame has equal aspect (L2-L1).
 */
export function ResidualSquare({
  x,
  y,
  prediction,
  color,
  opacity = 0.25,
}: {
  x: number;
  y: number;
  prediction: number;
  color: string;
  opacity?: number;
}) {
  const frame = useChartFrame();
  const side = Math.abs(y - prediction);
  const geometry = useMemo(() => {
    const corners = [
      [x, y],
      [x + side, y],
      [x + side, prediction],
      [x, prediction],
    ].map((p) => toWorld(frame, p));
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap((k) => corners[k]), 3));
    return g;
  }, [frame, x, y, prediction, side]);
  if (side < 1e-12) return null;
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} transparent opacity={opacity} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}
