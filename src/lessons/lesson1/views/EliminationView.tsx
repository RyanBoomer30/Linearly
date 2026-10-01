import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { Tex } from '../../../components/display/Tex';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { PIVOT_COLOR } from '../../../theme/colors';
import { useState } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { attempt } from '../../../store/useSystem';
import { useStore } from '../../../store/useStore';
import { useSceneColors } from '../../../theme/useTheme';
import { eliminationView, rowPictureAtStep } from '../models';
import { RowPictureContents, rowPictureFit } from './SceneContents';

const sub = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';

/** §5.4 */
export function EliminationView() {
  const view = useViewModel((A, b) => eliminationView(A, b));
  const steps = view.ok ? view.value.rref.trace.steps : [];
  const stepper = useStepper(steps.length, view.ok ? view.value.rref.trace.steps[0].matrix : null);
  const step = steps[stepper.index];
  const [linkRowPicture, setLinkRowPicture] = useState(false);
  const colors = useSceneColors();
  const n = useStore((s) => s.aCells[0]?.length ?? 0);
  const RowCanvas = n === 2 ? Canvas2D : Canvas3D;
  const rowScene = view.ok && linkRowPicture ? attempt(() => rowPictureAtStep(view.value, stepper.index)) : null;

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
      {!view.ok && <ViewNotice error={view.error} />}
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
      {view.ok && stepper.index === steps.length - 1 && (
        <div className="readout">
          <div>
            Pivot columns: {view.value.rref.pivotCols.map((j) => `x${sub(j + 1)}`).join(', ') || 'none'} · Free:{' '}
            {view.value.freeCols.map((j) => `x${sub(j + 1)}`).join(', ') || 'none'}
          </div>
          {view.value.rref.inconsistent && (
            <div className="solution-msg warn" role="status">
              Row {view.value.rref.inconsistentRow! + 1} reads 0 = 1: no solution.
            </div>
          )}
        </div>
      )}
      <label>
        <input type="checkbox" checked={linkRowPicture} onChange={(e) => setLinkRowPicture(e.target.checked)} /> Show the
        row picture at each step (the equations change, the solutions don't)
      </label>
      {linkRowPicture && rowScene?.ok && (
        <RowCanvas fit={rowPictureFit(rowScene.value)}>
          <RowPictureContents scene={rowScene.value} markerColor={colors.result} />
        </RowCanvas>
      )}
      {linkRowPicture && rowScene && !rowScene.ok && <ViewNotice error={rowScene.error} />}
      {view.ok && view.value.parametricTex && stepper.index === steps.length - 1 && (
        <Tex tex={view.value.parametricTex} display />
      )}
    </ModuleLayout>
  );
}
