import { Simplex } from '../../../components/canvas/charts/Simplex';
import { BarChart } from '../../../components/display/BarChart';
import { Caption } from '../../../components/display/Caption';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { SURFER_RANGE, T_RANGE } from '../../../presets/lesson5';
import { useLesson5Store } from '../../../store/useLesson5Store';
import { attempt } from '../../../store/useSystem';
import { stateColor } from '../../../theme/colors';
import { evolutionView, simplexView, surferView } from '../models';
import { useLesson5 } from '../useLesson5';
import { Controls } from './Controls';

/** §9.2 */
export function EvolutionView() {
  const { t, setT, stateNames, numberDisplay, surfers, setSurfers, seed, newSeed, setX0FromSimplex } = useLesson5Store();
  const view = useLesson5((s) => evolutionView(s.P, s.x0, t, stateNames, numberDisplay), [t, stateNames, numberDisplay]);
  const crowd = useLesson5((s) => surferView(s.P, s.x0, surfers, t, seed), [surfers, t, seed]);
  const simplex = useLesson5((s) => simplexView(s.P, s.x0, t), [t]);
  const trace = view.ok ? view.value.rowsTrace : [];
  const stepper = useStepper(trace.length, view.ok ? view.value.stepTex : null);
  const step = trace[stepper.index];

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§5.1">
            If x(t) is the distribution at time t, then x(t + 1) = Px(t), so x(t) = Pᵗx₀.
          </Caption>
          <label className="sliders">
            <span>t = {t}</span>
            <input type="range" min={T_RANGE[0]} max={T_RANGE[1]} step={1} value={t} onChange={(e) => setT(Number(e.target.value))} />
          </label>
          <div className="editor-buttons">
            <button type="button" onClick={() => setT(Math.max(T_RANGE[0], t - 1))} disabled={t <= T_RANGE[0]}>
              ◀ Step back
            </button>
            <button type="button" onClick={() => setT(Math.min(T_RANGE[1], t + 1))} disabled={t >= T_RANGE[1]}>
              Step forward ▶
            </button>
          </div>
          <label className="sliders">
            <span>Surfers N = {surfers}</span>
            <input type="range" min={SURFER_RANGE[0]} max={SURFER_RANGE[1]} step={10} value={surfers} onChange={(e) => setSurfers(Number(e.target.value))} />
          </label>
          <p className="caption">
            Seed {seed}{' '}
            <button type="button" className="link-button" onClick={() => attempt(newSeed)}>
              New seed
            </button>
          </p>
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          {view.value.x0Problem && <p className="solution-msg warn">{view.value.x0Problem}</p>}
          <section>
            <h3>
              One step: <Tex tex="x(t+1) = Px(t)" />
            </h3>
            <Tex tex={view.value.stepTex} display />
            {trace.length > 0 && <StepperControls stepper={stepper} description={step?.description} tex={step?.tex} />}
          </section>
          <section>
            <h3>
              x({t}) {crowd.ok && <span className="caption">with {surfers} surfers overlaid</span>}
            </h3>
            <BarChart
              bars={view.value.bars}
              overlay={crowd.ok ? crowd.value.shares : undefined}
              overlayLabel="black lines: share of surfers"
              caption={crowd.ok ? crowd.value.caption : undefined}
            />
            {!crowd.ok && <ViewNotice error={crowd.error} />}
          </section>
          <section>
            <h3>
              All at once: <Tex tex="x(t) = P^t x_0" />
            </h3>
            <Tex tex={view.value.powerTex} display />
          </section>
          <section>
            <h3>x(0) … x({t})</h3>
            <table className="comparison-table evolution-table">
              <thead>
                <tr>
                  <th>t</th>
                  {stateNames.map((name, i) => (
                    <th key={i} style={{ color: stateColor(i) }}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.value.table.map((row) => (
                  <tr key={row.t} className={row.t === t ? 'selected' : undefined}>
                    <td>{row.t}</td>
                    {row.entries.map((e, i) => (
                      <td key={i}>{e}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      <section>
        <h3>The simplex of distributions</h3>
        {!simplex.ok && <ViewNotice error={simplex.error} />}
        {simplex.ok && (
          <>
            <Simplex
              n={simplex.value.n}
              vertexLabels={stateNames}
              vertexColors={stateNames.map((_, i) => stateColor(i))}
              paths={simplex.value.paths}
              markers={simplex.value.markers}
              draggable={{ p: simplex.value.x0, color: '#E69F00', onDrag: (p) => attempt(() => setX0FromSimplex(p)) }}
            />
            <p className="caption">Drag the orange point to choose a mixed x₀. Paths from every corner head to the same point when P is regular.</p>
          </>
        )}
      </section>
    </ModuleLayout>
  );
}
