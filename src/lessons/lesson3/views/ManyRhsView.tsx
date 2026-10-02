import { useState } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Axes2D, chartFit, FunctionPlot, Scatter } from '../../../components/canvas/charts';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import type { Vector } from '../../../core/matrix';
import { useLesson3Store } from '../../../store/useLesson3Store';
import { attempt } from '../../../store/useSystem';
import { growthChart, housingYearsView, manyRhsView } from '../models';
import { useLesson3 } from '../useLesson3';
import { Controls } from './Controls';
import { subscript, texEntries } from './format';

/**
 * L3-K6: the cost notes cited in Lesson 3. TODO: the URL is not in the PRD;
 * set it here and the link appears.
 */
const COST_NOTES_URL: string | null = null;

const tuple = (v: Vector | null) => (v ? `(${v.map((x) => x.toTex()).join(', ')})` : '\\text{—}');

/** §7.5 */
export function ManyRhsView() {
  const pivoting = useLesson3Store((s) => s.pivoting);
  const [logLog, setLogLog] = useState(false);
  const view = useLesson3((s) => manyRhsView(s.A, s.rhs, pivoting), [pivoting]);
  const chart = attempt(() => growthChart(logLog));
  const housing = attempt(() => housingYearsView());

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§3.3">
            Factor once, solve many times: every new b costs only two triangular solves.
          </Caption>
          {view.ok && <p className="caption">{view.value.rule}</p>}
          {COST_NOTES_URL ? (
            <a href={COST_NOTES_URL} target="_blank" rel="noreferrer">
              More on computational cost (notes)
            </a>
          ) : (
            <p className="caption">More on computational cost: see the cost notes cited in the lesson.</p>
          )}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <section>
            <h3>Solutions (A factored once)</h3>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>b</th>
                  <th>c (Lc = b)</th>
                  <th>x (Ux = c)</th>
                </tr>
              </thead>
              <tbody>
                {view.value.rows.map((r) => (
                  <tr key={r.k}>
                    <td>
                      <Tex tex={`b_${r.k + 1} = ${tuple(r.b)}`} />
                    </td>
                    <td>
                      <Tex tex={tuple(r.c)} />
                    </td>
                    <td>
                      <Tex tex={tuple(r.x)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h3>Operations counted</h3>
            <p>
              Factor A once: {view.value.factorCost}; each pair of solves: {view.value.solveCost}.
            </p>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Right-hand sides</th>
                  <th>Eliminate [A | b] each time</th>
                  <th>Factor once, then substitute</th>
                </tr>
              </thead>
              <tbody>
                {view.value.costs.fromScratch.map((total, k) => (
                  <tr key={k}>
                    <td>{k + 1}</td>
                    <td>{total}</td>
                    <td>{view.value.costs.withLu[k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      <section>
        <h3>
          How the cost grows with n{' '}
          <label>
            <input type="checkbox" checked={logLog} onChange={(e) => setLogLog(e.target.checked)} /> log–log
          </label>
        </h3>
        {chart.ok ? (
          <>
            <Canvas2D bare fit={chartFit(chart.value.frame)}>
              <Axes2D frame={chart.value.frame}>
                {chart.value.curves.map((c) => (
                  <FunctionPlot key={c.label} points={c.points} color={c.color} />
                ))}
                {chart.value.measured.map((m) => (
                  <Scatter key={m.label} points={m.points.map((p) => ({ at: p, color: m.color }))} />
                ))}
              </Axes2D>
            </Canvas2D>
            <ul className="legend">
              {chart.value.curves.map((c) => (
                <li key={c.label} style={{ color: c.color }}>
                  {c.label}
                </li>
              ))}
            </ul>
            {logLog && (
              <p className="caption">
                Slopes: about {chart.value.slopes.factor.toFixed(2)} for factoring (n³) and {chart.value.slopes.solve.toFixed(2)} for each pair of solves (n²).
              </p>
            )}
          </>
        ) : (
          <ViewNotice error={chart.error} />
        )}
      </section>
      <section>
        <h3>Houses, several years of prices (Lesson 2)</h3>
        <p className="caption">Factor XᵀX = LU once, then solve the normal equation for each year's prices.</p>
        {housing.ok ? (
          <>
            <div className="matrix-pair">
              <Tex tex="X^TX = LU:" />
              <MatrixTex entries={texEntries(housing.value.L)} />
              <MatrixTex entries={texEntries(housing.value.U)} />
            </div>
            <ul className="checks">
              {housing.value.years.map((y, k) => (
                <li key={y.label} style={{ color: y.color }}>
                  {y.label}: <Tex tex={`\\theta^*_${subscript(k + 1)} = ${tuple(y.theta)}`} />
                </li>
              ))}
            </ul>
            <Canvas2D bare fit={chartFit(housing.value.frame)}>
              <Axes2D frame={housing.value.frame}>
                {housing.value.years.map((y) => (
                  <FunctionPlot key={y.label} points={y.curve} color={y.color} />
                ))}
                <Scatter points={housing.value.points} />
              </Axes2D>
            </Canvas2D>
          </>
        ) : (
          <ViewNotice error={housing.error} />
        )}
      </section>
    </ModuleLayout>
  );
}
