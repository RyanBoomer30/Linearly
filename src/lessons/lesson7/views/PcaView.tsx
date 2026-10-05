import { Caption } from '../../../components/display/Caption';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { centeringSteps, pcaView, scatterView, type Point } from '../models';
import { useLesson7 } from '../useLesson7';
import { PcaControls, SignControls } from './PcaControls';
import { CheckList, Scatter2D } from './shared';

const FLOAT = { kind: 'float' as const, reason: 'σ² = 150 ± 25√29 is irrational' };
const round = (M: number[][]) => M.map((r) => r.map((x) => x.toFixed(2)));

/** §11.3 */
export function PcaView() {
  const { standardize, sign, flipV1, numberDisplay } = useLesson7Store();
  const steps = useLesson7((s) => centeringSteps(s.X, numberDisplay), [numberDisplay]);
  const view = useLesson7((s) => pcaView(s.X, { standardize, sign, flipV1 }), [standardize, sign, flipV1]);
  const raw = useLesson7((s) => scatterView(s.X.map((r) => [r[0].toNumber(), r[1].toNumber()] as Point), ['x₁ (age)', 'x₂ (height)']));
  const centered = useLesson7(() => (view.ok ? scatterView(view.value.centered, ['x₁ − x̄₁', 'x₂ − x̄₂']) : null), [view]);
  const stepper = useStepper(steps.ok ? steps.value.length : 0);
  const step = steps.ok ? steps.value[stepper.index] : undefined;

  return (
    <ModuleLayout
      controls={
        <PcaControls>
          <Caption section="§7.1">
            Principal components are the singular vectors vᵢ of the centered data matrix X. Replacing X by its best rank-k
            approximation keeps the k most important directions.
          </Caption>
          <SignControls />
        </PcaControls>
      }
    >
      <section>
        <h3>Centering</h3>
        {!steps.ok && <ViewNotice error={steps.error} />}
        {steps.ok && <StepperControls stepper={stepper} description={step?.description} tex={step?.tex} />}
        <div className="scatter-pair">
          {raw.ok && <Scatter2D frame={raw.value.frame} points={raw.value.points} />}
          {centered?.ok && centered.value && <Scatter2D frame={centered.value.frame} points={centered.value.points} />}
        </div>
        <p className="caption">Before (left) and after (right) subtracting the means: the origin moves to the center of the data.</p>
      </section>
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <div className="panel-header">
            <PrecisionBadge precision={FLOAT} />
          </div>
          <section>
            <h3>
              The reduced SVD <Tex tex="X = U_r \Sigma_r V_r^T" />
            </h3>
            <div className="matrix-pair">
              <Tex tex="X =" />
              <Tex tex={view.value.factorsTex.U} display />
              <Tex tex={view.value.factorsTex.Sigma} display />
              <Tex tex={view.value.factorsTex.Vt} display />
            </div>
            <div className="heatmap-row">
              <MatrixHeatmap entries={view.value.pieces[0]} maxAbs={10} labels={round(view.value.pieces[0])} caption="σ₁u₁v₁ᵀ" />
              <span>+</span>
              <MatrixHeatmap entries={view.value.pieces[1]} maxAbs={10} labels={round(view.value.pieces[1])} caption="σ₂u₂v₂ᵀ" />
              <span>= X</span>
            </div>
            <CheckList checks={[view.value.check]} />
          </section>
          <section>
            <h3>The components on the scatter</h3>
            {centered?.ok && centered.value && <Scatter2D frame={centered.value.frame} points={centered.value.points} lines={view.value.lines} />}
            <ul className="legend">
              {view.value.lines.map((l) => (
                <li key={l.label} style={{ color: l.color }}>
                  {l.label}
                </li>
              ))}
            </ul>
            <p className="caption">{view.value.signNote}</p>
          </section>
        </>
      )}
    </ModuleLayout>
  );
}
