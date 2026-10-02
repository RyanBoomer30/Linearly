import { AnyMatrixTex, anyVectorEntries } from '../../../components/display/AnyMatrixTex';
import { Caption } from '../../../components/display/Caption';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { useLesson4Store } from '../../../store/useLesson4Store';
import { attempt } from '../../../store/useSystem';
import { PIVOT_COLOR } from '../../../theme/colors';
import { qrView } from '../models';
import { useLesson4 } from '../useLesson4';
import { CheckList } from './PropertiesView';
import { Controls } from './Controls';
import { ReflectorScene } from './ReflectorScene';

/** §8.3 */
export function QrView() {
  const sign = useLesson4Store((s) => s.sign);
  const openInLesson1 = useLesson4Store((s) => s.openInLesson1);
  const view = useLesson4((s) => ({ ...qrView(s.A, sign), A: s.A, b: s.b }), [sign]);
  const steps = view.ok ? view.value.steps : [];
  const stepper = useStepper(steps.length, view.ok ? view.value.result : null);
  const step = steps[stepper.index];
  const atEnd = stepper.index === steps.length - 1;

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§4.3">
            One reflector per column: Hₖ clears column k below the diagonal. Then Hₙ ⋯ H₁A = R and Q = H₁ ⋯ Hₙ.
          </Caption>
          {view.ok && <p className="caption">{view.value.signNote}</p>}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && step && (
        <>
          <div className="panel-header">
            <PrecisionBadge precision={view.value.result.precision} />
          </div>
          {stepper.index === 0 && <Tex tex={view.value.shapeTex} display />}
          <StepperControls stepper={stepper} description={step.description} tex={step.tex} />
          <div className="lu-panels">
            <figure>
              <figcaption>Current matrix Hₖ ⋯ H₁A</figcaption>
              <AnyMatrixTex M={step.current} highlights={{ entryBackgrounds: Object.fromEntries(step.zeroed.map((c) => [`${c.row},${c.col}`, PIVOT_COLOR])) }} />
            </figure>
            <figure>
              <figcaption>Reflector H{step.k + 1}</figcaption>
              <AnyMatrixTex M={step.H} />
            </figure>
            <figure>
              <figcaption>Q so far: H₁ ⋯ H{step.k + 1}</figcaption>
              <AnyMatrixTex M={step.Qsofar} />
            </figure>
          </div>
          <p>
            <Tex tex={`x = (${anyVectorEntries(step.x).join(', ')}),\\; w = (${anyVectorEntries(step.w).join(', ')}),\\; v = x - w = (${anyVectorEntries(step.v).join(', ')})`} />
          </p>
          <CheckList checks={[step.check]} />
          {step.scene && <ReflectorScene scene={step.scene} />}
          {atEnd && (
            <>
              <ol className="derivation">
                {view.value.qDerivation.map((d, k) => (
                  <li key={k}>
                    <Tex tex={d.tex} display />
                    <span className="caption">{d.reason}</span>
                  </li>
                ))}
              </ol>
              <CheckList checks={view.value.finalChecks} />
            </>
          )}
          {view.value.dependentNote && (
            <p className="solution-msg warn" role="status">
              {view.value.dependentNote}{' '}
              <button type="button" className="link-button" onClick={() => attempt(() => openInLesson1(view.value.A, view.value.b, 'normal'))}>
                See which column depends on which (Lesson 1)
              </button>
            </p>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
