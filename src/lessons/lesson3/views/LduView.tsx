import { useRef } from 'react';
import { Caption } from '../../../components/display/Caption';
import { EntryFlight } from '../../../components/display/EntryFlight';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { useLesson3Store } from '../../../store/useLesson3Store';
import { PIVOT_COLOR } from '../../../theme/colors';
import { lduView } from '../models';
import { useLesson3 } from '../useLesson3';
import { Controls } from './Controls';
import { texEntries } from './format';

/** §7.6 */
export function LduView() {
  const pivoting = useLesson3Store((s) => s.pivoting);
  const view = useLesson3((s) => lduView(s.A, pivoting), [pivoting]);
  // L3-D1: one step per pivot pulled out of U, plus the starting state.
  const n = view.ok ? view.value.pivots.length : 0;
  const stepper = useStepper(n + 1, view.ok ? view.value.luU : null);
  const pulled = stepper.index; // rows 0 … pulled − 1 already divided by their pivots
  const uRef = useRef<HTMLDivElement>(null);
  const dRef = useRef<HTMLDivElement>(null);

  return (
    <ModuleLayout
      controls={
        <Controls showRhs={false}>
          <Caption section="§3.4">Pull the pivots out of U into a diagonal D: A = LDU, with 1s on the diagonals of L and U.</Caption>
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <StepperControls
            stepper={stepper}
            description={pulled === 0 ? 'Start with A = LU' : `Divide row ${pulled} of U by its pivot; the pivot moves into D`}
          />
          <div className="lu-panels">
            <figure>
              <figcaption>L</figcaption>
              <MatrixTex entries={texEntries(view.value.ldu.L)} />
            </figure>
            <figure ref={dRef}>
              <figcaption>D</figcaption>
              <MatrixTex
                entries={view.value.ldu.D.map((r, i) => r.map((x, j) => (i === j && i >= pulled ? '\\cdot' : x.toTex())))}
                highlights={{ entryBackgrounds: Object.fromEntries(view.value.pivots.map((_, i) => [`${i},${i}`, PIVOT_COLOR])) }}
              />
            </figure>
            <figure ref={uRef}>
              <figcaption>U</figcaption>
              <MatrixTex entries={texEntries(view.value.luU.map((r, i) => (i < pulled ? view.value.ldu.U[i] : r)))} />
            </figure>
          </div>
          {pulled > 0 && (
            <EntryFlight
              from={{ container: uRef, row: pulled - 1, col: pulled - 1 }}
              to={{ container: dRef, row: pulled - 1, col: pulled - 1 }}
              runKey={pulled}
            >
              <Tex tex={view.value.pivots[pulled - 1].toTex()} />
            </EntryFlight>
          )}
          {pulled === n && (
            <>
              <p className={view.value.check.equal ? 'hit' : 'solution-msg warn'}>
                <Tex tex={view.value.check.tex} />
              </p>
              <p>{view.value.unitDiagonalNote}</p>
            </>
          )}
          {view.value.singular && (
            <p className="solution-msg warn" role="status">
              {view.value.singular}
            </p>
          )}
          {view.value.symmetric && (
            <aside className="callout">
              <strong>Beyond the notes.</strong> {view.value.symmetric.note}
            </aside>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
