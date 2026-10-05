import { useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridWorld } from '../../../components/diagram/GridWorld';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { ACTION_ARROWS, ACTIONS } from '../../../core/mdp';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { attempt } from '../../../store/useSystem';
import { gridCells, learningChart, learningView, planWithEstimate } from '../models';
import { useLesson6 } from '../useLesson6';
import { Controls } from './Controls';
import { LineChart, selectedState } from './shared';

/** §10.2 */
export function LearningView() {
  const { selectedCell, selectedAction, selectAction, clickCell, numberDisplay, seed, experienceSteps, setExperienceSteps, terminalMode } = useLesson6Store();
  const [explore, setExplore] = useState<'random' | 'policy'>('random');
  const learned = useLesson6(
    (s) => learningView(s.mdp, explore === 'random' ? null : s.policy, experienceSteps, seed, (() => {
      const st = selectedState(s.mdp, selectedCell);
      return st === null ? null : { s: st, a: selectedAction };
    })(), numberDisplay),
    [explore, experienceSteps, seed, selectedCell, selectedAction, numberDisplay],
  );
  const cells = useLesson6(
    (s) =>
      gridCells(
        s.mdp,
        learned.ok
          ? {
              // Errors of 0.2 or more get the full overlay.
              overlay: learned.value.stateErrors.map((e) => (e === null ? 0 : Math.min(1, e * 5))),
              overlayLabels: learned.value.stateErrors.map((e) => (e === null ? '?' : `±${e.toFixed(2)}`)),
            }
          : {},
        numberDisplay,
      ),
    [learned, numberDisplay],
  );
  const chart = useLesson6((s) => learningChart(s.mdp, explore === 'random' ? null : s.policy, seed), [explore, seed]);
  const plan = useLesson6((s) => (learned.ok ? planWithEstimate(s.mdp, learned.value.estimate, s.gamma, terminalMode) : null), [learned, terminalMode]);

  return (
    <ModuleLayout
      controls={
        <Controls showPainter={false}>
          <Caption section="§6.1">The transition probabilities and the reward function may be given, or learned from data.</Caption>
          <div className="segmented" role="group" aria-label="Exploration">
            <button type="button" className={explore === 'random' ? 'active' : undefined} onClick={() => setExplore('random')}>
              Random actions
            </button>
            <button type="button" className={explore === 'policy' ? 'active' : undefined} onClick={() => setExplore('policy')}>
              Painted policy
            </button>
          </div>
          <label className="sliders">
            <span>Steps collected: {experienceSteps}</span>
            <input type="range" min={100} max={20000} step={100} value={experienceSteps} onChange={(e) => setExperienceSteps(Number(e.target.value))} />
          </label>
          <div className="segmented" role="group" aria-label="Action">
            {ACTIONS.map((a) => (
              <button key={a} type="button" className={selectedAction === a ? 'active' : undefined} onClick={() => selectAction(a)}>
                {ACTION_ARROWS[a]}
              </button>
            ))}
          </div>
        </Controls>
      }
    >
      {!learned.ok && <ViewNotice error={learned.error} />}
      {learned.ok && (
        <>
          <section>
            <h3>The notes&apos; estimate</h3>
            <Tex tex={learned.value.formulaTex} display />
            {learned.value.selected ? (
              <p>
                <Tex tex={learned.value.selected.tex} /> <span className="caption">(action taken {learned.value.selected.tried} times)</span>
              </p>
            ) : (
              <p className="caption">Click a state (Inspect mode) to see its estimated P̂ₛₐ for the chosen action.</p>
            )}
          </section>
          <section className="grid-layout">
            {cells.ok && <GridWorld cells={cells.value} selected={selectedCell} onCellClick={(c) => attempt(() => clickCell(c))} caption="Bluer: larger estimation error in that state; ? = no action tried there." />}
            <div>
              <h3>
                First steps of {learned.value.total} (s, a, s′, r)
              </h3>
              <table className="comparison-table experience-table">
                <thead>
                  <tr>
                    <th>s</th>
                    <th>a</th>
                    <th>s′</th>
                    <th>r</th>
                  </tr>
                </thead>
                <tbody>
                  {learned.value.sample.map((t, i) => (
                    <tr key={i}>
                      <td>{t.s + 1}</td>
                      <td>{ACTION_ARROWS[t.a]}</td>
                      <td>{t.next + 1}</td>
                      <td>{t.r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {learned.value.unknown.length > 0 && (
            <p className="solution-msg warn">Never tried, so unknown: {learned.value.unknown.join('; ')}.</p>
          )}
        </>
      )}
      <section>
        <h3>Error against steps collected</h3>
        {!chart.ok && <ViewNotice error={chart.error} />}
        {chart.ok && <LineChart frame={chart.value.frame} series={[{ label: 'average |P̂ − P| (weighted by how often each action was tried)', color: '#0072B2', points: chart.value.points }]} slope={chart.value.reference} />}
      </section>
      <section>
        <h3>Plan with the estimate</h3>
        {!plan.ok && <ViewNotice error={plan.error} />}
        {plan.ok && plan.value && <p>{plan.value.caption}</p>}
      </section>
    </ModuleLayout>
  );
}
