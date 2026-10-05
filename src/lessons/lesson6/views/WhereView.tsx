import { BarChart } from '../../../components/display/BarChart';
import { Caption } from '../../../components/display/Caption';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridWorld } from '../../../components/diagram/GridWorld';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { distributionView, finishView, gridCells } from '../models';
import { useLesson6 } from '../useLesson6';
import { Controls } from './Controls';

/** §10.4: a fixed policy turns the MDP into a Markov chain, so Lesson 5's tools apply. */
export function WhereView() {
  const { t, setT, numberDisplay, runs, setRuns, seed } = useLesson6Store();
  const dist = useLesson6((s) => distributionView(s.mdp, s.policy, t), [t]);
  const cells = useLesson6((s) => gridCells(s.mdp, { policy: s.policy, overlay: dist.ok ? dist.value.x : undefined, robotAt: null }, numberDisplay), [dist, numberDisplay]);
  const finish = useLesson6((s) => finishView(s.mdp, s.policy, s.gamma, s.mdp.start, runs, seed), [runs, seed]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§6.1">
            Probability has entered the process s₀ → s₁ → s₂ → ⋯. With the policy fixed, the robot&apos;s position is a
            Markov chain: x(t + 1) = T_π x(t), with T_π = P_πᵀ.
          </Caption>
          <label className="sliders">
            <span>t = {t}</span>
            <input type="range" min={0} max={40} step={1} value={t} onChange={(e) => setT(Number(e.target.value))} />
          </label>
          <div className="editor-buttons">
            <button type="button" onClick={() => setT(Math.max(0, t - 1))} disabled={t <= 0}>
              ◀ Step back
            </button>
            <button type="button" onClick={() => setT(Math.min(40, t + 1))} disabled={t >= 40}>
              Step forward ▶
            </button>
          </div>
          <label className="sliders">
            <span>Rollouts: {runs}</span>
            <input type="range" min={10} max={5000} step={10} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />
          </label>
        </Controls>
      }
    >
      {!cells.ok && <ViewNotice error={cells.error} />}
      {cells.ok && <GridWorld cells={cells.value} caption={`Where the robot is at t = ${t}, starting from the start state; +1 and −1 hold it once it arrives.`} />}
      <section>
        <h3>Where it finishes</h3>
        {!finish.ok && <ViewNotice error={finish.error} />}
        {finish.ok && (
          <>
            <BarChart bars={finish.value.bars} overlay={finish.value.simulated.map((x) => x.share)} overlayLabel="black lines: share of rollouts" />
            <ul>
              {finish.value.exact.map((e) => (
                <li key={e.state}>{e.label}</li>
              ))}
            </ul>
            <p className="caption">{finish.value.note}</p>
          </>
        )}
      </section>
    </ModuleLayout>
  );
}
