import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Point } from '../../../components/canvas/primitives';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { useState } from 'react';
import { useDataStore } from '../../../store/useDataStore';
import { attempt } from '../../../store/useSystem';
import { PIVOT_COLOR } from '../../../theme/colors';
import { useSceneColors } from '../../../theme/useTheme';
import { RowPictureContents, rowPictureFit } from '../../lesson1/views/SceneContents';
import { inconsistentSystemView, type ParameterSpaceScene } from '../models';
import { useLessonData, useLessonDataRoot } from '../useLessonData';
import { Controls } from './Controls';

/** §6.2 */
export function InconsistentSystemView() {
  const view = useLessonData((d) => inconsistentSystemView(d));
  const openInLesson1 = useDataStore((s) => s.openInLesson1);
  const data = useLessonDataRoot();
  const [linkError, setLinkError] = useState<string | null>(null);
  const open = (target: 'projection' | 'normal') => {
    if (!data.ok) return;
    const r = attempt(() => openInLesson1(data.value.design.X, data.value.design.Y, target));
    if (!r.ok) setLinkError(r.error);
  };
  const steps = view.ok ? view.value.rref.trace.steps : [];
  const stepper = useStepper(steps.length, view.ok ? view.value.XY : null);
  const step = steps[stepper.index];

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§2.2">
            Plug every data point into the model: one equation per point. Together they form Xθ = Y, and the equations
            disagree.
          </Caption>
          {view.ok && (
            <div className="readout">
              {view.value.equations.map((eq) => (
                <Tex key={eq.row} tex={`\\textcolor{${eq.color}}{${eq.equationTex}}`} display />
              ))}
            </div>
          )}
          {/* TODO(L2-I1): animate a data row turning into its equation, its row of X, and its entry of Y. */}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      <section>
        <h3>Reduce [X | Y]</h3>
        <StepperControls stepper={stepper} description={step?.description} tex={step?.tex} />
        {step && (
          <MatrixTex
            augmented
            entries={step.matrix.map((r) => r.map((x) => x.toTex()))}
            highlights={{
              rowBackgrounds: step.matrix.map((_, i) => (step.changedRows.includes(i) ? '#dbeafe' : undefined)),
              entryBackgrounds: Object.fromEntries(step.pivots.map((p) => [`${p.row},${p.col}`, PIVOT_COLOR])),
            }}
          />
        )}
        {view.ok && view.value.inconsistentMessage && stepper.index === steps.length - 1 && (
          <p className="solution-msg warn" role="status">
            {view.value.inconsistentMessage}
          </p>
        )}
      </section>
      <section>
        <h3>Parameter space</h3>
        {view.ok && <ParameterSpace scene={view.value.parameterSpace} />}
      </section>
      <Caption section="Column picture">
        Y is not in C(X), so no θ works exactly.
        {view.ok && view.value.fitsLesson1 && (
          <>
            {' '}
            Open X and Y in Lesson 1 to{' '}
            <button type="button" className="link-button" onClick={() => open('projection')}>
              find the closest Xθ (projection)
            </button>{' '}
            and{' '}
            <button type="button" className="link-button" onClick={() => open('normal')}>
              solve the normal equation
            </button>
            .
          </>
        )}
      </Caption>
      {linkError && <ViewNotice error={linkError} />}
    </ModuleLayout>
  );
}

/** L2-I3: the equations drawn in (θ₀, θ₁), or on a number line for one parameter. */
function ParameterSpace({ scene }: { scene: ParameterSpaceScene }) {
  const colors = useSceneColors();
  if (scene.kind === 'none') return <ViewNotice error={scene.reason} />;
  if (scene.kind === 'numberLine') return <NumberLine scene={scene} />;
  return (
    <Canvas2D fit={[...rowPictureFit(scene.rowPicture), ...scene.intersections, scene.thetaStar]}>
      <RowPictureContents scene={scene.rowPicture} markerColor={colors.result} />
      {scene.intersections.map((p, i) => (
        <Point key={i} position={p} color={colors.axis} radius={0.08} />
      ))}
      <Point position={scene.thetaStar} color={colors.result} radius={0.14} />
    </Canvas2D>
  );
}

/** One parameter: each equation's own θ, with θ* among them. */
function NumberLine({ scene }: { scene: Extract<ParameterSpaceScene, { kind: 'numberLine' }> }) {
  const [lo, hi] = scene.range;
  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="number-line" role="img" aria-label="Each equation's value of θ, and θ*">
      <div className="number-line-axis" />
      {scene.values.map((v, i) => (
        <span key={i} className="number-line-mark" style={{ left: pct(v.value), color: v.color }}>
          <span className="number-line-dot" style={{ background: v.color }} />
          {v.label}
        </span>
      ))}
      <span className="number-line-mark star" style={{ left: pct(scene.thetaStar) }}>
        <span className="number-line-dot" />
        θ*
      </span>
    </div>
  );
}
