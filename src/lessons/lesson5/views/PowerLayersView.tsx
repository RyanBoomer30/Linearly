import { useState } from 'react';
import { AnyMatrixTex } from '../../../components/display/AnyMatrixTex';
import { Caption } from '../../../components/display/Caption';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { T_RANGE } from '../../../presets/lesson5';
import { useLesson5Store } from '../../../store/useLesson5Store';
import { powerLayersTrace, powerLayersView } from '../models';
import { useLesson5 } from '../useLesson5';
import { CheckList, Controls } from './Controls';

const round = (M: number[][]) => M.map((r) => r.map((x) => (Math.abs(x) < 5e-4 ? '0' : x.toFixed(3))));

/** §9.6: the Lesson 3 layer stack (§7.2) with the eigendecomposition as its factorization. */
export function PowerLayersView() {
  const { t, setT } = useLesson5Store();
  const [keep, setKeep] = useState(1);
  const view = useLesson5((s) => powerLayersView(s.P, t, keep), [t, keep]);
  const trace = useLesson5((s) => powerLayersTrace(s.P, t), [t]);
  const steps = trace.ok ? trace.value : [];
  const stepper = useStepper(steps.length, t);
  const step = steps[stepper.index];

  return (
    <ModuleLayout
      controls={
        <Controls showX0={false}>
          <Caption section="§5.3">
            Multiplying (VΛᵗ)V⁻¹ columns × rows writes Pᵗ as a sum of rank-1 matrices, one per eigenvector — more
            illuminating than the single final expression for Pᵗ.
          </Caption>
          <label className="sliders">
            <span>t = {t}</span>
            <input type="range" min={T_RANGE[0]} max={T_RANGE[1]} step={1} value={t} onChange={(e) => setT(Number(e.target.value))} />
          </label>
          {view.ok && (
            <label className="sliders">
              <span>
                Keep {keep} of {view.value.layers.length} layers
              </span>
              <input type="range" min={0} max={view.value.layers.length} step={1} value={keep} onChange={(e) => setKeep(Number(e.target.value))} />
            </label>
          )}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <div className="panel-header">
            <PrecisionBadge precision={view.value.precision} />
          </div>
          <section>
            <h3>
              <Tex tex={`P^{${t}} = \\sum_i \\lambda_i^{${t}}\\, v_i w_i^{\\mathsf T}`} />
            </h3>
            <div className="heatmap-row">
              {view.value.layers.map((l, i) => (
                <div key={l.index} className={i < keep ? 'layer kept' : 'layer'}>
                  <MatrixHeatmap entries={l.entries} maxAbs={view.value.maxAbs} labels={round(l.entries)} caption={`λ${l.index + 1} layer, ‖·‖ ≈ ${l.size.toPrecision(3)}`} />
                  <Tex tex={l.tex} />
                  {l.stationary && <span className="caption">{view.value.stationaryCaption}</span>}
                </div>
              ))}
              <div className="layer kept">
                <MatrixHeatmap entries={view.value.total} maxAbs={view.value.maxAbs} labels={round(view.value.total)} caption={`P^${t}`} />
              </div>
            </div>
          </section>
          <section>
            <h3>Keep {keep} layer{keep === 1 ? '' : 's'}</h3>
            <div className="heatmap-row">
              <MatrixHeatmap entries={view.value.partial} maxAbs={view.value.maxAbs} labels={round(view.value.partial)} caption="kept" />
              <MatrixHeatmap
                entries={view.value.leftover}
                maxAbs={view.value.maxAbs}
                labels={round(view.value.leftover)}
                caption={`leftover, ‖·‖ ≈ ${view.value.leftoverSize.toExponential(2)}`}
              />
            </div>
          </section>
          <section>
            <h3>Check at t = 0</h3>
            <CheckList checks={[view.value.identityCheck]} />
            {view.value.notesCheck && <p className="caption">{view.value.notesCheck}</p>}
          </section>
        </>
      )}
      <section>
        <h3>
          Step by step: <Tex tex="(V\Lambda^t)\,V^{-1}" />, columns × rows
        </h3>
        {!trace.ok && <ViewNotice error={trace.error} />}
        {trace.ok && step && (
          <>
            <StepperControls stepper={stepper} description={step.description} tex={step.tex} />
            <AnyMatrixTex M={step.matrix} />
          </>
        )}
      </section>
    </ModuleLayout>
  );
}
