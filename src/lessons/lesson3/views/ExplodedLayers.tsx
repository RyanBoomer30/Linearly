import { attempt } from '../../../store/useSystem';
import { divergingColor } from '../../../components/display/MatrixHeatmap';

/**
 * L3-R1: layers as translucent tiles stacked in 3D. `collapse` runs from 0
 * (exploded, one level per layer) to 1 (every tile at height 0: the sum).
 */
export function ExplodedLayers({ layers, maxAbs, collapse, gap = 1.5 }: { layers: number[][][]; maxAbs: number; collapse: number; gap?: number }) {
  return (
    <group>
      {layers.map((layer, k) => {
        const z = (layers.length - 1 - k) * gap * (1 - collapse);
        return layer.map((row, i) =>
          row.map((v, j) => {
            const color = attempt(() => divergingColor(v, maxAbs));
            return (
              <mesh key={`${k},${i},${j}`} position={[j, -i, z]}>
                <boxGeometry args={[0.92, 0.92, 0.08]} />
                <meshStandardMaterial color={color.ok ? color.value : '#a1a1aa'} transparent opacity={0.75} depthWrite={false} />
              </mesh>
            );
          }),
        );
      })}
    </group>
  );
}
