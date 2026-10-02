import { useEffect, useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import type { ProductMode } from '../../../core/productTrace';
import { useLesson3Store } from '../../../store/useLesson3Store';
import { attempt } from '../../../store/useSystem';
import { PIVOT_COLOR } from '../../../theme/colors';
import { matchingStep, twoWaysView } from '../models';
import { useLesson3 } from '../useLesson3';
import { ProductControls } from './Controls';
import { texEntries } from './format';

const HIGHLIGHT = '#dbeafe';

/** §7.1 */
export function TwoWaysView() {
  const [mode, setMode] = useState<ProductMode>('rowsByColumns');
  const openInLesson1 = useLesson3Store((s) => s.openInLesson1);
  const view = useLesson3((s) => ({ ...twoWaysView(s.B, s.C, mode), B: s.B, C: s.C }), [mode]);
  const steps = view.ok ? view.value.steps : [];
  const stepper = useStepper(steps.length, view.ok ? `${view.value.B}|${view.value.C}|${mode}` : null);
  const step = steps[stepper.index];
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  // L3-MM4: switch modes without losing the step position.
  const switchMode = (next: ProductMode) => {
    if (!view.ok || next === mode) return;
    const target = attempt(() => matchingStep(view.value.B, view.value.C, mode, stepper.index));
    setMode(next);
    setPendingIndex(target.ok ? target.value : null);
  };
  // Runs after the stepper has reset for the new trace.
  useEffect(() => {
    if (pendingIndex === null) return;
    stepper.goTo(pendingIndex);
    setPendingIndex(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const rowBg = (n: number, on: number | null) => Array.from({ length: n }, (_, i) => (i === on ? HIGHLIGHT : undefined));
  const B = view.ok ? view.value.B : [];
  // Lesson 1 takes A and b: with x = C, b is the product Bx, whose solution is x.
  const bOf = () => (view.ok ? view.value.result.map((r) => r[0]) : []);
  const C = view.ok ? view.value.C : [];

  return (
    <ModuleLayout
      controls={
        <ProductControls>
          <Caption section="§3.1">
            BC two ways: each entry is a row of B times a column of C, or the whole product is a sum of columns of B times rows
            of C.
          </Caption>
          <div className="segmented" role="group" aria-label="Multiplication mode">
            <button type="button" className={mode === 'rowsByColumns' ? 'active' : undefined} onClick={() => switchMode('rowsByColumns')}>
              Rows × columns
            </button>
            <button type="button" className={mode === 'columnsByRows' ? 'active' : undefined} onClick={() => switchMode('columnsByRows')}>
              Columns × rows
            </button>
          </div>
          {view.ok && <Tex tex={view.value.shape.tex} display />}
        </ProductControls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <StepperControls stepper={stepper} description={step?.description} tex={step?.tex} />
          <div className="matrix-pair">
            <MatrixTex
              entries={texEntries(B)}
              highlights={{
                rowBackgrounds: rowBg(B.length, step?.entry?.row ?? null),
                columnColors: B[0]?.map((_, j) => (j === step?.k ? '#CC3311' : undefined)),
              }}
            />
            <Tex tex="\times" />
            <MatrixTex
              entries={texEntries(C)}
              highlights={{
                rowBackgrounds: rowBg(C.length, step?.k ?? null),
                columnColors: C[0]?.map((_, j) => (j === step?.entry?.col ? '#CC3311' : undefined)),
              }}
            />
            <Tex tex="=" />
            {step && (
              <MatrixTex
                entries={texEntries(step.partial)}
                highlights={{ entryBackgrounds: step.entry ? { [`${step.entry.row},${step.entry.col}`]: PIVOT_COLOR } : {} }}
              />
            )}
          </div>
          {step?.layer && (
            <section>
              <h3>This layer: column {step.k! + 1} of B × row {step.k! + 1} of C</h3>
              <MatrixTex entries={texEntries(step.layer)} />
            </section>
          )}
          {stepper.index === steps.length - 1 && (
            <p className={view.value.check.equal ? 'hit' : 'solution-msg warn'}>
              <Tex tex={view.value.check.tex} />
            </p>
          )}
          {view.value.vectorCase && (
            <aside className="callout">
              <p>C has one column, so BC is Ax with A = B and x = C.</p>
              <p>
                {view.value.vectorCase.rowPicture}{' '}
                <button type="button" className="link-button" onClick={() => attempt(() => openInLesson1(B, bOf(), 'row'))}>
                  Open the row picture
                </button>
              </p>
              <p>
                {view.value.vectorCase.columnPicture}{' '}
                <button type="button" className="link-button" onClick={() => attempt(() => openInLesson1(B, bOf(), 'column'))}>
                  Open the column picture
                </button>
              </p>
            </aside>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
