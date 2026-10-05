import { useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridWorld } from '../../../components/diagram/GridWorld';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { randomPolicy } from '../../../core/mdp';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { gridCells, policyIterationView } from '../models';
import { useLesson6 } from '../useLesson6';
import { Controls } from './Controls';
import { LineChart } from './shared';

/** §10.6 */
export function PolicyIterationView() {
  const { numberDisplay, terminalMode, seed } = useLesson6Store();
  const [start, setStart] = useState<'painted' | 'random'>('painted');
  const view = useLesson6(
    (s) => policyIterationView(s.mdp, start === 'random' ? randomPolicy(s.mdp, seed) : s.policy, s.gamma, terminalMode, [s.mdp.start], numberDisplay),
    [start, seed, terminalMode, numberDisplay],
  );
  const frames = view.ok ? view.value.frames : [];
  const stepper = useStepper(frames.length, frames);
  const frame = frames[stepper.index];
  const cells = useLesson6((s) => (frame ? gridCells(s.mdp, { policy: frame.policy, values: frame.V, changed: frame.changed }, numberDisplay) : null), [frame, numberDisplay]);
  const history = useLesson6((s) => (view.ok ? view.value.history.map((p) => gridCells(s.mdp, { policy: p }, numberDisplay)) : []), [view, numberDisplay]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§6.3">
            Choose an initial policy, solve the Bellman equation for V^π, set π′(s) = argmax Σ Pₛₐ(s′)V^π(s′) in every
            state, and repeat until the policy no longer changes.
          </Caption>
          <div className="segmented" role="group" aria-label="Starting policy">
            <button type="button" className={start === 'painted' ? 'active' : undefined} onClick={() => setStart('painted')}>
              Start from the painted policy
            </button>
            <button type="button" className={start === 'random' ? 'active' : undefined} onClick={() => setStart('random')}>
              Random (seed {seed})
            </button>
          </div>
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <div className="panel-header">
            <PrecisionBadge precision={view.value.precision} />
          </div>
          <StepperControls stepper={stepper} description={frame?.description} tex={frame?.tex} />
          {cells.ok && cells.value && <GridWorld cells={cells.value} caption={frame?.kind === 'evaluate' ? 'Evaluate: V^π on the grid.' : 'Improve: changed arrows outlined.'} />}
          <p>
            {view.value.evaluations} evaluations (each a linear solve), {view.value.changes} policy changes.
          </p>
          <p className="caption">{view.value.tieRule}</p>
          <section>
            <h3>The policy after each improvement</h3>
            <div className="history-strip">
              {history.ok &&
                history.value.map((c, i) => (
                  <div key={i} className="history-item">
                    <GridWorld cells={c} size={26} labels="none" />
                    <span className="caption">{i + 1}</span>
                  </div>
                ))}
            </div>
          </section>
          <section>
            <h3>V^π at the start state across iterations</h3>
            <LineChart frame={view.value.chart.frame} series={view.value.chart.series} />
            <p className="caption">{view.value.monotoneNote}</p>
          </section>
        </>
      )}
    </ModuleLayout>
  );
}
