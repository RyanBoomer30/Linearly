import { useRef, useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { EntryFlight } from '../../../components/display/EntryFlight';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import type { Matrix } from '../../../core/matrix';
import { useLesson3Store } from '../../../store/useLesson3Store';
import { MULTIPLIER_COLOR, PIVOT_COLOR } from '../../../theme/colors';
import { luView, peelingView } from '../models';
import { useLesson3 } from '../useLesson3';
import { Controls } from './Controls';
import { floatEntries, texEntries } from './format';

/** Multipliers below the diagonal, in red (compact form and L). */
const belowDiagonalRed = (M: Matrix) =>
  Object.fromEntries(M.flatMap((r, i) => r.flatMap((_, j) => (j < i ? [[`${i},${j}`, MULTIPLIER_COLOR]] : []))));

/** §7.3 */
export function LuView() {
  const pivoting = useLesson3Store((s) => s.pivoting);
  const compact = useLesson3Store((s) => s.compact);
  const setCompact = useLesson3Store((s) => s.setCompact);
  const setView = useLesson3Store((s) => s.setView);
  const [peeling, setPeeling] = useState(false);
  const view = useLesson3((s) => luView(s.A, pivoting), [pivoting]);
  const peel = useLesson3((s) => (peeling ? peelingView(s.A, pivoting) : null), [peeling, pivoting]);
  const steps = view.ok ? view.value.steps : [];
  const stepper = useStepper(steps.length, view.ok ? view.value.result : null);
  const step = steps[stepper.index];
  const currentRef = useRef<HTMLDivElement>(null);
  const lRef = useRef<HTMLDivElement>(null);
  const atEnd = stepper.index === steps.length - 1;

  return (
    <ModuleLayout
      controls={
        <Controls showRhs={false}>
          <Caption section="§3.2">
            LU is elimination with its multipliers remembered: each multiplier goes into L, and the pivot rows form U.
          </Caption>
          <label>
            <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> Compact storage (multipliers
            below the diagonal)
          </label>
          <label>
            <input type="checkbox" checked={peeling} onChange={(e) => setPeeling(e.target.checked)} /> Peeling: A = l₁u₁* + l₂u₂* + ⋯
          </label>
          {view.ok && <p className="caption">{view.value.notationNote}</p>}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && step && (
        <>
          <StepperControls stepper={stepper} description={step.description} tex={step.tex} />
          <div className="lu-panels">
            <figure ref={currentRef}>
              <figcaption>{compact ? 'Compact form' : 'Current matrix'}</figcaption>
              <MatrixTex
                entries={texEntries(compact ? step.compact : step.current)}
                highlights={{
                  rowBackgrounds: step.current.map((_, i) => (step.changedRows.includes(i) ? '#dbeafe' : undefined)),
                  entryBackgrounds: step.pivot ? { [`${step.pivot.row},${step.pivot.col}`]: PIVOT_COLOR } : {},
                  entryColors: compact ? belowDiagonalRed(step.compact) : {},
                }}
              />
            </figure>
            <figure ref={lRef}>
              <figcaption>L so far</figcaption>
              <MatrixTex entries={texEntries(step.L)} highlights={{ entryColors: belowDiagonalRed(step.L) }} />
            </figure>
            <figure>
              <figcaption>U so far</figcaption>
              <MatrixTex entries={texEntries(step.current)} />
            </figure>
          </div>
          {step.multiplier && (
            // L3-LU1: the multiplier flies from the matrix into its slot in L.
            <EntryFlight
              from={{ container: currentRef, row: step.multiplier.row, col: step.multiplier.col }}
              to={{ container: lRef, row: step.multiplier.row, col: step.multiplier.col }}
              runKey={stepper.index}
            >
              <span style={{ color: MULTIPLIER_COLOR }}>
                <Tex tex={step.multiplier.value.toTex()} />
              </span>
            </EntryFlight>
          )}
          <p className={step.check.equal ? 'hit' : 'solution-msg warn'}>
            <Tex tex={step.check.tex} />
          </p>
          {view.value.statusMessage && atEnd && (
            <div className="solution-msg warn" role="status">
              {view.value.statusMessage}{' '}
              {view.value.needsRowExchange && (
                <button type="button" className="link-button" onClick={() => setView('permutations')}>
                  Continue in the PA = LU view
                </button>
              )}
            </div>
          )}
          {atEnd && (
            <section>
              <Tex tex={view.value.finalCheck.tex} display />
              <p>{view.value.recipe}</p>
            </section>
          )}
        </>
      )}
      {peel && !peel.ok && <ViewNotice error={peel.error} />}
      {peel?.ok && peel.value && (
        <section>
          <h3>Peeling A into rank-1 pieces</h3>
          <div className="heatmap-row">
            {peel.value.layers.map((layer, k) => (
              <div key={k} className="layer">
                <MatrixHeatmap entries={floatEntries(layer)} maxAbs={peel.value!.maxAbs} labels={texEntries(layer).map((r) => r.map(String))} caption={`l${k + 1}u${k + 1}*`} />
                <MatrixHeatmap
                  entries={floatEntries(peel.value!.remainders[k])}
                  maxAbs={peel.value!.maxAbs}
                  labels={peel.value!.remainders[k].map((r) => r.map((x) => x.toString()))}
                  caption={peel.value!.captions[k]}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </ModuleLayout>
  );
}
