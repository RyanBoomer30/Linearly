import { Caption } from '../../../components/display/Caption';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridWorld } from '../../../components/diagram/GridWorld';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { gridCells, Q_LEARNING_CARD, qLearningView, qValuesView, valueIterationView } from '../models';
import { useLesson6 } from '../useLesson6';
import { Controls } from './Controls';
import { LineChart } from './shared';

/** §10.7 */
export function ValueIterationView() {
  const { numberDisplay, terminalMode, seed, qAnswerRevealed, revealQAnswer, qLearning, setQLearning } = useLesson6Store();
  const vi = useLesson6((s) => valueIterationView(s.mdp, s.gamma, terminalMode), [terminalMode]);
  const frames = vi.ok ? vi.value.frames : [];
  const stepper = useStepper(frames.length, frames);
  const frame = frames[stepper.index];
  const viCells = useLesson6((s) => (frame ? gridCells(s.mdp, { values: frame.V }, numberDisplay) : null), [frame, numberDisplay]);
  const qv = useLesson6((s) => qValuesView(s.mdp, s.gamma, terminalMode, numberDisplay), [terminalMode, numberDisplay]);
  const qCells = useLesson6((s) => (qv.ok ? gridCells(s.mdp, { q: qv.value.q }, numberDisplay) : null), [qv, numberDisplay]);
  const ql = useLesson6((s) => qLearningView(s.mdp, s.gamma, terminalMode, { ...qLearning, seed }), [terminalMode, qLearning, seed]);
  const qlCells = useLesson6((s) => (ql.ok ? gridCells(s.mdp, { q: ql.value.q }, numberDisplay) : null), [ql, numberDisplay]);

  return (
    <ModuleLayout
      controls={
        <Controls showPainter={false}>
          <Caption section="§6.3">
            The notes name a second algorithm, value iteration: update V(s) = R(s) + γ max Σ Pₛₐ(s′)V(s′) in every state,
            with no linear system to solve, until it stops changing.
          </Caption>
          <fieldset>
            <legend>Q-learning (optional)</legend>
            <label className="sliders">
              <span>Episodes: {qLearning.episodes}</span>
              <input type="range" min={10} max={5000} step={10} value={qLearning.episodes} onChange={(e) => setQLearning({ episodes: Number(e.target.value) })} />
            </label>
            <label className="sliders">
              <span>Learning rate α = {qLearning.alpha}</span>
              <input type="range" min={0.05} max={1} step={0.05} value={qLearning.alpha} onChange={(e) => setQLearning({ alpha: Number(e.target.value) })} />
            </label>
            <label className="sliders">
              <span>Exploration ε = {qLearning.epsilon}</span>
              <input type="range" min={0} max={1} step={0.05} value={qLearning.epsilon} onChange={(e) => setQLearning({ epsilon: Number(e.target.value) })} />
            </label>
            <p className="caption">Seed {seed}</p>
          </fieldset>
        </Controls>
      }
    >
      <section>
        <h3>Value iteration</h3>
        {!vi.ok && <ViewNotice error={vi.error} />}
        {vi.ok && (
          <>
            <StepperControls stepper={stepper} description={frame ? `Sweep ${frame.k}` : undefined} tex={frame?.tex} />
            {viCells.ok && viCells.value && <GridWorld cells={viCells.value} />}
            <LineChart
              frame={vi.value.chart.frame}
              series={[{ label: 'max change between sweeps', color: '#0072B2', points: vi.value.chart.points }]}
              curve={{ points: vi.value.chart.reference, label: 'γᵏ: the guaranteed rate (here it is faster, because episodes end at +1 or −1)' }}
            />
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Steps</th>
                  <th>Work per step</th>
                </tr>
              </thead>
              <tbody>
                {vi.value.comparison.map((c) => (
                  <tr key={c.method}>
                    <td>{c.method}</td>
                    <td>{c.steps}</td>
                    <td>{c.work}</td>
                  </tr>
                ))}
              </tbody>
              <caption>{vi.value.agrees ? 'Both reach the same optimal policy.' : 'The policies differ: value iteration has not converged yet.'}</caption>
            </table>
          </>
        )}
      </section>
      <section>
        <h3>
          Q-values: <Tex tex="Q(s,a) = R(s) + \gamma \sum_{s'} P_{sa}(s')V^*(s')" />
        </h3>
        {!qv.ok && <ViewNotice error={qv.error} />}
        {qv.ok && (
          <div className="panel-header">
            <PrecisionBadge precision={qv.value.precision} />
          </div>
        )}
        {qCells.ok && qCells.value && <GridWorld cells={qCells.value} size={96} caption="Four triangles per cell, one per action; the best is outlined, and V*(s) is the largest Q in the cell." />}
      </section>
      <section className="q-card">
        <h3>{Q_LEARNING_CARD.question}</h3>
        {qAnswerRevealed ? (
          <p>{Q_LEARNING_CARD.answer}</p>
        ) : (
          <button type="button" onClick={revealQAnswer}>
            Reveal the answer
          </button>
        )}
      </section>
      <section>
        <h3>Q-learning from experience</h3>
        {!ql.ok && <ViewNotice error={ql.error} />}
        {ql.ok && (
          <>
            {qlCells.ok && qlCells.value && <GridWorld cells={qlCells.value} size={96} />}
            <LineChart frame={ql.value.chart.frame} series={[{ label: 'max |Q − Q*|', color: '#D55E00', points: ql.value.chart.points }]} />
            <p className="caption">{ql.value.caption}</p>
          </>
        )}
      </section>
    </ModuleLayout>
  );
}
