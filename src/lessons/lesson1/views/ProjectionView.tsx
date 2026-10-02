import { Line } from '@react-three/drei';
import { useState } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Arrow, Label, Point, RightAngleMarker, Span } from '../../../components/canvas/primitives';
import type { Vec3 } from '../../../components/canvas/types';
import { Caption } from '../../../components/display/Caption';
import { MathText } from '../../../components/display/MathText';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useStore } from '../../../store/useStore';
import { SUBSPACE_COLORS } from '../../../theme/colors';
import { useSceneColors } from '../../../theme/useTheme';
import { projectionView, type ProjectionScene } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';

const vecTex = (v: { toTex(): string }[]) => `\\begin{bmatrix}${v.map((x) => x.toTex()).join(' \\\\ ')}\\end{bmatrix}`;

/** Projection onto C(A): when Ax = b has no solution, the closest Ax is the projection p of b. */
export function ProjectionView() {
  const setView = useStore((s) => s.setView);
  // Slider position; null = at x̂.
  const [x, setX] = useState<number[] | null>(null);
  const view = useViewModel((A, b) => projectionView(A, b, x), [x?.join(',')]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="Lesson 2, §2.2">
            <MathText>
              {'When $b$ is not in $C(A)$, no $x$ solves $Ax = b$. The closest $Ax$ is the projection $p = A\\hat x$, and the error $e = b - p$ is perpendicular to $C(A)$.'}
            </MathText>
          </Caption>
          {view.ok && (
            <>
              <div className="sliders">
                {view.value.weights.map((w, k) => (
                  <label key={k}>
                    <span>
                      <Tex tex={w.tex} /> = {+w.value.toFixed(3)}
                    </span>
                    <input
                      type="range"
                      min={w.min}
                      max={w.max}
                      step={w.step}
                      value={w.value}
                      onChange={(e) =>
                        setX(view.value.weights.map((v, i) => (i === k ? Number(e.target.value) : v.value)))
                      }
                    />
                  </label>
                ))}
                <div className="theta-status">
                  {view.value.scene?.atOptimum ? (
                    <span className="hit">
                      <MathText>{'At $\\hat x$: $\\|b - Ax\\|$ is as small as it can be.'}</MathText>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setX(null)}>
                      Go to <Tex tex="\hat x" />
                    </button>
                  )}
                </div>
              </div>
              <div className="readout">
                {view.value.scene && <div>‖b − Ax‖ = {view.value.scene.distance.toFixed(4)}</div>}
                <Tex tex={`p = ${vecTex(view.value.p)}, \\quad e = ${vecTex(view.value.e)}`} display />
                <div>
                  <strong>Aᵀe = 0</strong> (e is in N(Aᵀ)):
                  <ul className="checks">
                    {view.value.orthogonality.map((o) => (
                      <li key={o.label}>
                        <Tex tex={`${o.tex} = ${o.value.toTex()}`} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
          <p className="caption">
            The same split b = p + e appears in the{' '}
            <button type="button" className="link-button" onClick={() => setView('bigPicture')}>
              big picture
            </button>{' '}
            (Aᵀ mode), and <Tex tex="\hat x" /> comes from the{' '}
            <button type="button" className="link-button" onClick={() => setView('normal')}>
              normal equation
            </button>
            .
          </p>
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && view.value.note && <ViewNotice error={view.value.note} />}
      {view.ok && view.value.scene && <ProjectionCanvas scene={view.value.scene} />}
    </ModuleLayout>
  );
}

/** L2-P1, L2-P2: C(A), b, p, e with a right angle, and the moving Ax with its distance to b. */
function ProjectionCanvas({ scene }: { scene: ProjectionScene }) {
  const colors = useSceneColors();
  const SceneCanvas = scene.dim === 2 ? Canvas2D : Canvas3D;
  const eDir = scene.e.to.map((c, i) => c - scene.e.from[i]) as Vec3;
  return (
    <SceneCanvas fit={[scene.b, scene.p, scene.Ax, ...scene.columns.map((c) => c.to)]}>
      <Span vectors={scene.span.vectors} color={SUBSPACE_COLORS.column} opacity={0.2} />
      {scene.columns.map((c) => (
        <group key={c.label}>
          <Arrow to={c.to} color={c.color} />
          <Label position={c.to} tex={c.label} color={c.color} />
        </group>
      ))}
      <Arrow to={scene.b} color={colors.target} />
      <Label position={scene.b} tex="b" color={colors.target} />
      <Arrow to={scene.p} color={SUBSPACE_COLORS.column} />
      <Label position={scene.p} tex="p" color={SUBSPACE_COLORS.column} />
      <Arrow from={scene.e.from} to={scene.e.to} color={SUBSPACE_COLORS.leftNull} />
      <group position={scene.p}>
        <RightAngleMarker u={eDir} v={scene.p.map((c) => -c) as Vec3} color={colors.axis} />
      </group>
      <Point position={scene.Ax} color={scene.atOptimum ? SUBSPACE_COLORS.column : colors.axis} />
      <Label position={scene.Ax} tex="Ax" color={colors.text} />
      <Line points={[scene.Ax, scene.b]} color={colors.axis} lineWidth={2} dashed dashSize={0.2} gapSize={0.15} />
    </SceneCanvas>
  );
}
