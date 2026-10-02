import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Arrow, DragHandle, Label, Line2D, Plane, RightAngleMarker } from '../../../components/canvas/primitives';
import type { Vec3 } from '../../../components/canvas/types';
import { useSceneColors } from '../../../theme/useTheme';
import type { ReflectorScene as Scene } from '../models';

/** Colors from the notes' figure: Px in red, v in blue. */
export const REFLECTOR_COLORS = { x: '#009E73', w: '#E69F00', v: '#0072B2', Px: '#CC3311', mirror: '#a1a1aa', y: '#CC79A7' };

const half = (p: Vec3): Vec3 => [p[0] / 2, p[1] / 2, p[2] / 2];

/**
 * L4-H2, L4-H3, L4-H5: x, w, v = x − w, Px, the mirror U ⟂ v, and a second
 * vector y with its reflection. Shared by §8.1 and the QR stepper (L4-QR3).
 */
export function ReflectorScene({ scene, onDragW, onDragY }: { scene: Scene; onDragW?: (p: Vec3) => void; onDragY?: (p: Vec3) => void }) {
  const colors = useSceneColors();
  const SceneCanvas = scene.dim === 2 ? Canvas2D : Canvas3D;
  const n = scene.mirrorNormal;
  return (
    <SceneCanvas fit={[scene.x, scene.w, scene.y, scene.Hy]}>
      {/* The mirror U: a line in ℝ², a plane in ℝ³, through the origin and perpendicular to v. */}
      {scene.dim === 2 ? (
        <Line2D a={n[0]} b={n[1]} c={0} color={REFLECTOR_COLORS.mirror} dashed />
      ) : (
        <Plane normal={n} offset={0} color={REFLECTOR_COLORS.mirror} opacity={0.2} size={8} />
      )}
      <Arrow to={scene.x} color={REFLECTOR_COLORS.x} />
      <Label position={scene.x} tex="x" color={REFLECTOR_COLORS.x} />
      <Arrow to={scene.w} color={REFLECTOR_COLORS.w} />
      <Label position={scene.w} tex="w = Hx" color={REFLECTOR_COLORS.w} />
      <Arrow from={scene.w} to={scene.x} color={REFLECTOR_COLORS.v} />
      <Label position={half([scene.x[0] + scene.w[0], scene.x[1] + scene.w[1], scene.x[2] + scene.w[2]])} tex="v" color={REFLECTOR_COLORS.v} />
      <Arrow to={scene.Px} color={REFLECTOR_COLORS.Px} />
      <Label position={scene.Px} tex="Px" color={REFLECTOR_COLORS.Px} />
      <group position={scene.Px}>
        <RightAngleMarker u={scene.Px.map((c) => -c) as Vec3} v={scene.x.map((c, i) => c - scene.Px[i]) as Vec3} color={colors.axis} />
      </group>
      <Arrow to={scene.y} color={REFLECTOR_COLORS.y} opacity={0.6} />
      <Label position={scene.y} tex="y" color={REFLECTOR_COLORS.y} />
      <Arrow to={scene.Hy} color={REFLECTOR_COLORS.y} />
      <Label position={scene.Hy} tex="Hy" color={REFLECTOR_COLORS.y} />
      {onDragW && <DragHandle position={scene.w} color={REFLECTOR_COLORS.w} onDrag={onDragW} planar={scene.dim === 2} />}
      {onDragY && <DragHandle position={scene.y} color={REFLECTOR_COLORS.y} onDrag={onDragY} planar={scene.dim === 2} />}
    </SceneCanvas>
  );
}
