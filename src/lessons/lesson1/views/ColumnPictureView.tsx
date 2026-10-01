import { useEffect, useRef, useState } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Caption } from '../../../components/display/Caption';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { Tex } from '../../../components/display/Tex';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { Rational } from '../../../core/rational';
import { useStore } from '../../../store/useStore';
import { columnColor, SUBSPACE_COLORS } from '../../../theme/colors';
import { useSceneColors } from '../../../theme/useTheme';
import { columnPictureScene, columnSpaceScene, solveTarget } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';
import { ColumnPictureContents, columnPictureFit, ColumnSpaceLayer } from './SceneContents';

const STEP = 10; // sliders move in tenths
const SOLVE_MS = 700;
const fmt = (v: readonly number[]) => `(${v.map((x) => +x.toFixed(3)).join(', ')})`;
const sup = (k: number) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[k];

/**
 * §5.2 + §5.5: the column picture (one combination of the columns reaching b)
 * and, with the C(A) layer on, the column space (all combinations at once).
 */
export function ColumnPictureView() {
  const n = useStore((s) => s.aCells[0]?.length ?? 0);
  const m = useStore((s) => s.aCells.length);
  const setBCell = useStore((s) => s.setBCell);
  const colors = useSceneColors();
  const [showSpace, setShowSpace] = useState(false);
  // Weights are exact: sliders snap to tenths, Solve lands on the exact solution.
  const [x, setX] = useState<Rational[]>(() => Array(n).fill(Rational.ZERO));
  const weights = x.length === n ? x : Array.from({ length: n }, (_, j) => x[j] ?? Rational.ZERO);
  const scene = useViewModel((A, b) => columnPictureScene(A, b, weights), [weights.map(String).join(',')]);
  const space = useViewModel((A, b) => columnSpaceScene(A, b));
  const target = useViewModel((A, b) => solveTarget(A, b));
  const SceneCanvas = m === 2 ? Canvas2D : Canvas3D;
  const anim = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (anim.current !== null) cancelAnimationFrame(anim.current);
    },
    [],
  );

  // L1-C4: tween the sliders to the solution, then land on the exact values.
  const solveNow = () => {
    if (!target.ok || !target.value) return;
    const goal = target.value;
    const start = weights.map((w) => w.toNumber());
    const t0 = performance.now();
    const frame = (now: number) => {
      const s = Math.min(1, (now - t0) / SOLVE_MS);
      const ease = 1 - (1 - s) ** 3;
      if (s < 1) {
        setX(start.map((a, j) => Rational.of(Math.round((a + (goal[j].toNumber() - a) * ease) * 1000), 1000)));
        anim.current = requestAnimationFrame(frame);
      } else {
        setX(goal);
        anim.current = null;
      }
    };
    anim.current = requestAnimationFrame(frame);
  };

  // L1-CS3: dragging b writes integer entries back to the editor.
  const dragB = (p: readonly number[]) => p.slice(0, m).forEach((v, i) => setBCell(i, String(v)));

  const noSolution = target.ok && target.value === null;
  const cs = space.ok ? space.value : null;

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§1.1">
            Column picture: Ax is a linear combination of the columns. Find the weights that reach b.
          </Caption>
          <div className="sliders">
            {Array.from({ length: n }, (_, j) => (
              <label key={j} style={{ color: columnColor(j) }}>
                <span>
                  x<sub>{j + 1}</sub> = {weights[j].toString()}
                </span>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={1 / STEP}
                  value={weights[j].toNumber()}
                  onChange={(e) => {
                    const v = Rational.of(Math.round(Number(e.target.value) * STEP), STEP);
                    setX(weights.map((w, k) => (k === j ? v : w)));
                  }}
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={solveNow} disabled={!target.ok || noSolution}>
            Solve
          </button>
          {noSolution && (
            <p className="solution-msg warn">
              No weights reach b: b is not in C(A).{!showSpace && ' Turn on the C(A) layer to see why.'}
            </p>
          )}
          {scene.ok && (
            <div className="readout">
              <Tex tex={scene.value.expansionTex} display />
              <Tex tex={scene.value.combinationTex} display />
              <div>
                ‖Ax − b‖ = {scene.value.distance.toFixed(3)} {scene.value.hit && <strong className="hit">Hit! Ax = b</strong>}
              </div>
            </div>
          )}

          <label className="layer-toggle">
            <input type="checkbox" checked={showSpace} onChange={(e) => setShowSpace(e.target.checked)} /> Show all
            combinations: the column space C(A)
          </label>
          {showSpace && (
            <>
              <Caption section="§1.2">
                Moving from one combination to all combinations gives a subspace. Ax = b has a solution if and only if b is
                in C(A).
              </Caption>
              {cs && (
                <div className="readout" style={{ borderColor: SUBSPACE_COLORS.column }}>
                  <div>
                    dim C(A) = {cs.rank}, spanned by the pivot columns{' '}
                    {cs.basis.map((v) => `a${'₀₁₂₃₄₅₆₇₈₉'[v.column + 1]}`).join(', ') || '(none)'}.
                  </div>
                  {cs.shape === 'all' && <div>C(A) fills ℝ{sup(m)}: every b is reachable.</div>}
                  {cs.shape === 'point' && <div>C(A) is just the origin: only b = 0 is reachable.</div>}
                  {(cs.shape === 'line' || cs.shape === 'plane') && (
                    <div>
                      b is <strong>{cs.inSpace ? 'in' : 'not in'}</strong> C(A)
                      {!cs.inSpace && ` (${cs.distance.toFixed(3)} off the ${cs.shape})`}.
                    </div>
                  )}
                  {cs.leftNullChecks.map((c, i) => (
                    <div key={i}>
                      Second test: y = {fmt(c.y.slice(0, m))} in N(Aᵀ) gives y · b = {c.dot}
                      {c.dot === '0' ? ', so b is in C(A).' : ', not 0, so b is not in C(A).'}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <p className="caption">Drag b in the scene to move it.</p>
        </Controls>
      }
    >
      {!scene.ok && <ViewNotice error={scene.error} />}
      <SceneCanvas fit={scene.ok ? columnPictureFit(scene.value) : undefined}>
        {showSpace && cs && <ColumnSpaceLayer scene={cs} />}
        {scene.ok && (
          <ColumnPictureContents
            scene={scene.value}
            resultColor={colors.result}
            targetColor={colors.target}
            onDragB={dragB}
          />
        )}
      </SceneCanvas>
    </ModuleLayout>
  );
}
