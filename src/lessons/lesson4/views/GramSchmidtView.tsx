import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Arrow, Label } from '../../../components/canvas/primitives';
import { AnyMatrixTex } from '../../../components/display/AnyMatrixTex';
import { Caption } from '../../../components/display/Caption';
import { MathText } from '../../../components/display/MathText';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import type { GsVariant } from '../../../core/gramSchmidt';
import { useLesson4Store } from '../../../store/useLesson4Store';
import { columnColor } from '../../../theme/colors';
import { gramSchmidtView } from '../models';
import { useLesson4 } from '../useLesson4';
import { Controls } from './Controls';

/** §8.7 */
export function GramSchmidtView() {
  const { gsVariant, setGsVariant } = useLesson4Store();
  const view = useLesson4((s) => gramSchmidtView(s.A, gsVariant), [gsVariant]);
  const steps = view.ok ? view.value.result.steps : [];
  const stepper = useStepper(steps.length, view.ok ? view.value.result : null);
  const step = steps[stepper.index];
  const variants: [GsVariant, string][] = [
    ['classical', 'Classical'],
    ['modified', 'Modified'],
  ];

  return (
    <ModuleLayout
      controls={
        <Controls showB={false} showSign={false}>
          <Caption section="Introduction">
            Gram–Schmidt (MATH2331) also gives A = QR. It is conceptually simpler than Householder but less stable numerically,
            which is why the notes use Householder.
          </Caption>
          <div className="segmented" role="group" aria-label="Gram–Schmidt variant">
            {variants.map(([value, label]) => (
              <button key={value} type="button" className={gsVariant === value ? 'active' : undefined} onClick={() => setGsVariant(value)}>
                {label}
              </button>
            ))}
          </div>
          {view.ok && (
            <p className="caption">
              <MathText>{view.value.variantDifference}</MathText>
            </p>
          )}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <section>
          <div className="panel-header">
            <PrecisionBadge precision={view.value.result.precision} />
          </div>
          <StepperControls stepper={stepper} description={step?.kind === 'project' ? `Subtract the projection of a${step.column + 1} onto q${step.onto + 1}` : step ? `Normalize: q${step.column + 1}` : undefined} tex={step?.tex} />
          <div className="matrix-pair">
            <Tex tex="Q =" />
            <AnyMatrixTex M={view.value.result.Q} />
            <Tex tex="R =" />
            <AnyMatrixTex M={view.value.result.R} />
          </div>
          <p className={view.value.agreement.agree ? 'hit' : 'caption'}>
            <MathText>{view.value.agreement.note}</MathText>
          </p>
          {view.value.scene && (
            <Canvas3D fit={[...view.value.scene.columns, ...view.value.scene.q]}>
              {view.value.scene.columns.map((c, j) => (
                <group key={`a${j}`}>
                  <Arrow to={c} color={columnColor(j)} opacity={0.5} />
                  <Label position={c} tex={`a_${j + 1}`} color={columnColor(j)} />
                </group>
              ))}
              {view.value.scene.q.map((q, j) => (
                <group key={`q${j}`}>
                  <Arrow to={q} color={columnColor(j)} />
                  <Label position={q} tex={`q_${j + 1}`} color={columnColor(j)} />
                </group>
              ))}
            </Canvas3D>
          )}
        </section>
      )}
    </ModuleLayout>
  );
}
