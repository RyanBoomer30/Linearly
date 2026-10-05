import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Axes2D, chartFit, FunctionPlot, Scatter } from '../../../components/canvas/charts';
import { ComplexPlane } from '../../../components/canvas/charts/ComplexPlane';
import { anyVectorEntries } from '../../../components/display/AnyMatrixTex';
import { BarChart } from '../../../components/display/BarChart';
import { Caption } from '../../../components/display/Caption';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson5Store } from '../../../store/useLesson5Store';
import { attempt } from '../../../store/useSystem';
import { stateColor } from '../../../theme/colors';
import { convergenceChart, longRunView, perronView } from '../models';
import { useLesson5 } from '../useLesson5';
import { Controls } from './Controls';

const tuple = (v: Parameters<typeof anyVectorEntries>[0]) => `\\left(${anyVectorEntries(v, 4).join(', ')}\\right)`;

/** §9.7 */
export function PerronView() {
  const { stateNames, surfers, seed, newSeed } = useLesson5Store();
  const view = useLesson5((s) => perronView(s.P));
  const chart = useLesson5((s) => convergenceChart(s.P, s.x0, 30));
  const longRun = useLesson5((s) => longRunView(s.P, s.x0, surfers, seed, stateNames), [surfers, seed, stateNames]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§5.4">
            For a regular transition matrix there is exactly one equilibrium distribution with Px = x, and x(t) → x_eq from
            any start.
          </Caption>
          {view.ok && <p className="caption theorem">{view.value.theorem}</p>}
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
          <section>
            <h3>Eigenvalues and the unit circle</h3>
            <ComplexPlane points={view.value.points} circles={view.value.circles} />
            {view.value.lambda2Abs !== null &&
              (view.value.lambda2Abs < 1 - 1e-9 ? (
                <p>|λ₂| ≈ {view.value.lambda2Abs.toPrecision(4)}: the distance to x_eq shrinks by about this factor each step.</p>
              ) : (
                <p>|λ₂| = 1: another eigenvalue sits on the unit circle, so that component never shrinks.</p>
              ))}
          </section>
          <section>
            <h3>Is P regular?</h3>
            <p>{view.value.regularityText}</p>
            {view.value.powerHeatmap && (
              <MatrixHeatmap
                entries={view.value.powerHeatmap.entries}
                maxAbs={1}
                labels={view.value.powerHeatmap.entries.map((r) => r.map((x) => (x === 0 ? '0' : x.toFixed(2))))}
                caption={`Pᵏ at k = ${view.value.powerHeatmap.k}`}
              />
            )}
          </section>
          <section>
            <h3>The stationary distribution, three ways</h3>
            <table className="comparison-table">
              <tbody>
                <tr>
                  <td>
                    Solve <Tex tex="(P - I)x = 0" />, entries summing to 1
                  </td>
                  <td>{view.value.stationary.elimination ? <Tex tex={tuple(view.value.stationary.elimination)} /> : '—'}</td>
                </tr>
                <tr>
                  <td>λ = 1 eigenvector, scaled to sum to 1</td>
                  <td>{view.value.stationary.eigenvector ? <Tex tex={tuple(view.value.stationary.eigenvector)} /> : '—'}</td>
                </tr>
                <tr>
                  <td>
                    A column of <Tex tex={`P^{${view.value.stationary.power.t}}`} />
                  </td>
                  <td>
                    <Tex tex={tuple(view.value.stationary.power.column)} />
                  </td>
                </tr>
              </tbody>
              <caption>{view.value.stationary.agreement}</caption>
            </table>
            {view.value.percentages.length > 0 && (
              <p>
                In the long run:{' '}
                {view.value.percentages.map((p, i) => (
                  <span key={i} style={{ color: stateColor(i) }}>
                    {p} on {stateNames[i]}
                    {i < view.value.percentages.length - 1 ? ', ' : '.'}
                  </span>
                ))}
              </p>
            )}
          </section>
        </>
      )}
      <section>
        <h3>Surfers in the long run</h3>
        {!longRun.ok && <ViewNotice error={longRun.error} />}
        {longRun.ok && (
          <BarChart bars={longRun.value.bars} overlay={longRun.value.exact ?? undefined} overlayLabel="black lines: x_eq" caption={longRun.value.caption} />
        )}
      </section>
      <section>
        <h3>Convergence: ‖x(t) − x_eq‖</h3>
        {!chart.ok && <ViewNotice error={chart.error} />}
        {chart.ok && (
          <>
            <Canvas2D bare fit={chartFit(chart.value.frame)}>
              <Axes2D frame={chart.value.frame}>
                {chart.value.reference && <FunctionPlot points={chart.value.reference.points} color="#71717a" lineWidth={1} />}
                <FunctionPlot points={chart.value.points} color={stateColor(0)} lineWidth={2} />
                <Scatter points={chart.value.points.map((p) => ({ at: p, color: stateColor(0) }))} />
              </Axes2D>
            </Canvas2D>
            {chart.value.reference && <p className="caption">Grey: {chart.value.reference.label}</p>}
            {chart.value.note && <p className="solution-msg warn">{chart.value.note}</p>}
          </>
        )}
      </section>
      {view.ok && <p className="caption lesson-summary">{view.value.summary}</p>}
    </ModuleLayout>
  );
}
