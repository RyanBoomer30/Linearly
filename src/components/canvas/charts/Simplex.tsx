import { Line } from '@react-three/drei';
import { attempt } from '../../../store/useSystem';
import { useSceneColors } from '../../../theme/useTheme';
import { ViewNotice } from '../../display/ViewNotice';
import { Canvas2D } from '../Canvas2D';
import { Canvas3D } from '../Canvas3D';
import { DragHandle } from '../primitives/DragHandle';
import { Label } from '../primitives/Label';
import { Point } from '../primitives/Point';
import type { Vec3 } from '../types';
import { barycentricToWorld, simplexVertices, worldToBarycentric } from './simplexGeometry';

export interface SimplexPath {
  /** Probability vectors in time order, e.g. x(0) … x(t). */
  points: number[][];
  color: string;
  label?: string;
}

export interface SimplexMarker {
  p: number[];
  color: string;
  label?: string;
}

interface SimplexProps {
  n: 2 | 3 | 4;
  vertexLabels: string[];
  vertexColors: string[];
  paths?: SimplexPath[];
  markers?: SimplexMarker[];
  /** L5-EV1: a point the student can drag; it stays inside the simplex. */
  draggable?: { p: number[]; color: string; onDrag: (p: number[]) => void };
}

/** v pushed `by` further from the centroid c, for vertex labels. */
const outward = (v: Vec3, c: Vec3, by: number): Vec3 => {
  const d = [v[0] - c[0], v[1] - c[1], v[2] - c[2]];
  const len = Math.hypot(...d) || 1;
  return [v[0] + (d[0] / len) * by, v[1] + (d[1] / len) * by, v[2] + (d[2] / len) * by];
};

function SimplexContents({ n, vertexLabels, vertexColors, paths = [], markers = [], draggable, vertices }: SimplexProps & { vertices: Vec3[] }) {
  const colors = useSceneColors();
  const centroid = vertices.reduce<Vec3>((c, v) => [c[0] + v[0] / n, c[1] + v[1] / n, c[2] + v[2] / n], [0, 0, 0]);
  const edges: Vec3[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push(vertices[i], vertices[j]);
  const world = (p: number[]) => attempt(() => barycentricToWorld(p));

  return (
    <>
      <Line points={edges} segments color={colors.axis} lineWidth={2} />
      {vertices.map((v, i) => (
        <group key={i}>
          <Point position={v} color={vertexColors[i]} radius={0.08} />
          <Label position={outward(v, centroid, 0.45)} color={vertexColors[i]}>
            {vertexLabels[i]}
          </Label>
        </group>
      ))}
      {paths.map((path, k) => {
        const pts = path.points.map(world).filter((r) => r.ok).map((r) => (r as { value: Vec3 }).value);
        return (
          <group key={k}>
            {pts.length > 1 && <Line points={pts} color={path.color} lineWidth={2} />}
            {pts.map((p, i) => (
              <Point key={i} position={p} color={path.color} radius={i === 0 ? 0.07 : 0.04} />
            ))}
          </group>
        );
      })}
      {markers.map((m, k) => {
        const at = world(m.p);
        return (
          at.ok && (
            <group key={k}>
              <Point position={at.value} color={m.color} radius={0.1} />
              {m.label && (
                <Label position={[at.value[0] + 0.25, at.value[1] + 0.25, at.value[2]]} color={m.color}>
                  {m.label}
                </Label>
              )}
            </group>
          )
        );
      })}
      {draggable &&
        (() => {
          const at = world(draggable.p);
          return (
            at.ok && (
              <DragHandle
                position={at.value}
                color={draggable.color}
                planar={n < 4}
                onDrag={(next) => {
                  const p = attempt(() => worldToBarycentric(next, n));
                  if (p.ok) draggable.onDrag(p.value);
                }}
              />
            )
          );
        })()}
    </>
  );
}

/**
 * F-C11: the space of probability vectors as a segment (2 states), a triangle
 * (3 states, on <Canvas2D>) or a tetrahedron (4 states, on <Canvas3D>), with
 * trajectories, markers and a draggable point that stays inside.
 */
export function Simplex(props: SimplexProps) {
  const vertices = attempt(() => simplexVertices(props.n));
  if (!vertices.ok) return <ViewNotice error={vertices.error} />;
  return props.n === 4 ? (
    <Canvas3D bare fit={vertices.value} cameraPosition={[4, 3, 3]}>
      <SimplexContents {...props} vertices={vertices.value} />
    </Canvas3D>
  ) : (
    <Canvas2D bare fit={vertices.value}>
      <SimplexContents {...props} vertices={vertices.value} />
    </Canvas2D>
  );
}
