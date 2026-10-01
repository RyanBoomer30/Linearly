import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { PendingNotice } from '../../../components/display/PendingNotice';
import { Tex } from '../../../components/display/Tex';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { PIVOT_COLOR } from '../../../theme/colors';
import { eliminationView } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';

/** §5.4 */
export function EliminationView() {
  const view = useViewModel((A, b) => eliminationView(A, b!));
  const steps = view.ok ? view.value.rref.trace.steps : [];
  const stepper = useStepper(steps.length);
  const step = steps[stepper.index];

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§1.1">
            Gaussian elimination: each row operation keeps the same solutions. Stop at rref and read off the pivots.
          </Caption>
        </Controls>
      }
    >
      {!view.ok && <PendingNotice error={view.error} />}
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
      {/* TODO: pivot/free column labels (L1-G2), inconsistent row banner (L1-G3), row-picture link (L1-G5) */}
      {view.ok && view.value.parametricTex && stepper.index === steps.length - 1 && (
        <Tex tex={view.value.parametricTex} display />
      )}
    </ModuleLayout>
  );
}
