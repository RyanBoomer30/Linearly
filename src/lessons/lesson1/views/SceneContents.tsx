import { Line } from '@react-three/drei';
import { Arrow, DragHandle, Label, Line2D, ParametricLine, Plane, Point, RightAngleMarker, Span } from '../../../components/canvas/primitives';
import type { Vec3 } from '../../../components/canvas/types';
import type { BigPictureMode, SubspaceId } from '../../../components/diagram/types';
import { SUBSPACE_COLORS, TARGET_COLOR } from '../../../theme/colors';
import type { BigPictureModel, ColumnPictureScene, ColumnSpaceScene, RowPictureScene } from '../models';

/** Draws a RowPictureScene into whichever canvas it is placed in. */
export function RowPictureContents({ scene, markerColor }: { scene: RowPictureScene; markerColor: string }) {
  return (
    <>
      {scene.lines.map((l, i) => (
        <Line2D key={i} a={l.a} b={l.b} c={l.c} color={l.color} />
      ))}
      {scene.planes.map((p, i) => (
        <Plane key={i} normal={p.normal} offset={p.offset} color={p.color} renderOrder={i} />
      ))}
      {scene.solution.kind === 'point' && <Point position={scene.solution.at} color={markerColor} />}
      {scene.solution.kind === 'line' && (
        <ParametricLine point={scene.solution.point} dir={scene.solution.dir} color={markerColor} lineWidth={6} />
      )}
      {scene.solution.kind === 'plane' && (
        <Plane point={scene.solution.point} spanning={scene.solution.spanning} color={markerColor} opacity={0.5} />
      )}
    </>
  );
}

/** Draws a ColumnPictureScene. */
export function ColumnPictureContents({
  scene,
  resultColor,
  targetColor,
  onDragB,
}: {
  scene: ColumnPictureScene;
  resultColor: string;
  targetColor: string;
  /** When given, b is a draggable handle (snaps to integers). */
  onDragB?: (b: Vec3) => void;
}) {
  const labelAt: Vec3 = [scene.b[0] + 0.35, scene.b[1] + 0.35, scene.b[2] + (scene.dim === 3 ? 0.35 : 0)];
  return (
    <>
      {scene.columns.map((c, j) => (
        <Arrow key={`col${j}`} to={c.to} color={c.color} opacity={0.35} />
      ))}
      {scene.tipToTail.map((s, j) => (
        <Arrow key={`ttt${j}`} from={s.from} to={s.to} color={s.color} />
      ))}
      {scene.guides.map((g, j) => (
        <Line key={`guide${j}`} points={[g.from, g.to]} color={g.color} lineWidth={1.5} dashed dashSize={0.2} gapSize={0.15} />
      ))}
      <Arrow to={scene.Ax} color={resultColor} radius={0.08} />
      {onDragB ? (
        <DragHandle position={scene.b} color={targetColor} onDrag={onDragB} snap planar={scene.dim === 2} />
      ) : (
        <Point position={scene.b} color={targetColor} radius={0.16} />
      )}
      <Label position={labelAt} tex="b" color={targetColor} />
    </>
  );
}

/** C(A) drawn as a line or plane through the origin, with its basis (pivot) columns emphasized (L1-CS1, L1-CS2). */
export function ColumnSpaceLayer({ scene }: { scene: ColumnSpaceScene }) {
  if (scene.shape !== 'line' && scene.shape !== 'plane') return null;
  return (
    <>
      <Span vectors={scene.basis.map((v) => v.to)} color={SUBSPACE_COLORS.column} opacity={0.22} />
      {scene.basis.map((v) => (
        <Arrow key={v.column} to={v.to} color={v.color} radius={0.065} />
      ))}
    </>
  );
}

/** One side of the big picture drawn in true coordinates: ℝⁿ (domain) or ℝᵐ (codomain). */
export function AmbientSpaceContents({
  scene,
  side,
  mode,
  focus,
}: {
  scene: BigPictureModel['scene'];
  side: 'domain' | 'codomain';
  mode: BigPictureMode;
  focus: SubspaceId | null;
}) {
  const [top, bottom]: [SubspaceId, SubspaceId] = side === 'domain' ? ['row', 'null'] : ['column', 'leftNull'];
  const spans = { row: scene.rowSpan, null: scene.nullSpan, column: scene.columnSpan, leftNull: scene.leftNullSpan };
  const opacity = (id: SubspaceId) => (focus === null ? 0.25 : focus === id ? 0.5 : 0.08);
  const guide = (from: Vec3, to: Vec3, color: string) => (
    <Line points={[from, to]} color={color} lineWidth={1.5} dashed dashSize={0.2} gapSize={0.15} />
  );

  return (
    <>
      {[top, bottom].map((id) => (
        <Span key={id} vectors={spans[id]} color={SUBSPACE_COLORS[id]} opacity={opacity(id)} />
      ))}
      {side === 'domain' && mode === 'A' && (
        <>
          <Arrow to={scene.xr} color={SUBSPACE_COLORS.row} />
          <Arrow to={scene.xn} color={SUBSPACE_COLORS.null} />
          <Arrow to={scene.x} color={TARGET_COLOR} radius={0.07} />
          {guide(scene.xr, scene.x, SUBSPACE_COLORS.null)}
          {guide(scene.xn, scene.x, SUBSPACE_COLORS.row)}
        </>
      )}
      {side === 'codomain' && mode === 'A' && <Arrow to={scene.b} color={SUBSPACE_COLORS.column} radius={0.07} />}
      {side === 'codomain' && mode === 'At' && scene.t && scene.p && scene.e && (
        <>
          <Arrow to={scene.p} color={SUBSPACE_COLORS.column} />
          <Arrow to={scene.e} color={SUBSPACE_COLORS.leftNull} />
          <Arrow to={scene.t} color={TARGET_COLOR} radius={0.07} />
          {guide(scene.p, scene.t, SUBSPACE_COLORS.leftNull)}
          {guide(scene.e, scene.t, SUBSPACE_COLORS.column)}
        </>
      )}
      <PerpendicularMarker a={spans[top]} b={spans[bottom]} />
    </>
  );
}

/** Right angle between two orthogonal subspaces, drawn at the origin when both are nonzero. */
function PerpendicularMarker({ a, b, color = TARGET_COLOR }: { a: Vec3[]; b: Vec3[]; color?: string }) {
  if (a.length === 0 || b.length === 0) return null;
  return <RightAngleMarker u={a[0]} v={b[0]} color={color} />;
}

/** Two orthogonal subspaces with basis arrows and a right-angle marker (L1-F3, L1-F4). */
export function PerpendicularPair({
  a,
  b,
  colors,
  markerColor,
}: {
  a: Vec3[];
  b: Vec3[];
  colors: [string, string];
  markerColor: string;
}) {
  return (
    <>
      <Span vectors={a} color={colors[0]} opacity={0.25} />
      <Span vectors={b} color={colors[1]} opacity={0.25} />
      {a.map((v, i) => <Arrow key={`a${i}`} to={v} color={colors[0]} />)}
      {b.map((v, i) => <Arrow key={`b${i}`} to={v} color={colors[1]} />)}
      <PerpendicularMarker a={a} b={b} color={markerColor} />
    </>
  );
}

/** Points worth framing for a row picture: the solution (or nothing to frame). */
export function rowPictureFit(scene: RowPictureScene): Vec3[] {
  const s = scene.solution;
  if (s.kind === 'point') return [s.at];
  const along = (p: Vec3, d: Vec3, k: number): Vec3 => [p[0] + k * d[0], p[1] + k * d[1], p[2] + k * d[2]];
  if (s.kind === 'line') return [s.point, along(s.point, s.dir, 2), along(s.point, s.dir, -2)];
  if (s.kind === 'plane') return [s.point, along(s.point, s.spanning[0], 2), along(s.point, s.spanning[1], 2)];
  return [];
}

export function columnPictureFit(scene: ColumnPictureScene): Vec3[] {
  return [...scene.columns.map((c) => c.to), ...scene.tipToTail.map((t) => t.to), scene.b];
}
