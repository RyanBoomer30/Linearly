import { Line } from '@react-three/drei';
import { Arrow, Label, Line2D, ParametricLine, Plane, Point, Span } from '../../../components/canvas/primitives';
import type { Vec3 } from '../../../components/canvas/types';
import type { BigPictureMode, SubspaceId } from '../../../components/diagram/types';
import { SUBSPACE_COLORS, TARGET_COLOR } from '../../../theme/colors';
import type { BigPictureModel, ColumnPictureScene, RowPictureScene } from '../models';

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
export function ColumnPictureContents({ scene, resultColor, targetColor }: { scene: ColumnPictureScene; resultColor: string; targetColor: string }) {
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
      <Point position={scene.b} color={targetColor} radius={0.16} />
      <Label position={scene.b} tex="b" color={targetColor} />
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
      {/* TODO: right-angle marker at the origin between the two subspaces (L1-F3/F4) */}
    </>
  );
}
