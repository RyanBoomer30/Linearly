import { Line } from '@react-three/drei';
import { Arrow, Label, Line2D, ParametricLine, Plane, Point } from '../../../components/canvas/primitives';
import type { ColumnPictureScene, RowPictureScene } from '../models';

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
