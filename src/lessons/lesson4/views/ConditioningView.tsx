import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Axes2D, chartFit, FunctionPlot, Scatter, SlopeLine } from '../../../components/canvas/charts';
import { formatFloat } from '../../../components/display/AnyMatrixTex';
import { Caption } from '../../../components/display/Caption';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { LOG_DELTA_RANGE } from '../../../presets/lesson4';
import { useLesson4Store } from '../../../store/useLesson4Store';
import { attempt } from '../../../store/useSystem';
import { conditioningSweep, conditioningView, nearCollinearView } from '../models';
import { useLesson4 } from '../useLesson4';
import { CheckList } from './PropertiesView';
import { Controls } from './Controls';

/** L4-C6: the numerical analysis notes cited in the Lesson 4 introduction (Lesson 8 there). */
const NUMERICAL_NOTES_URL: string | null = 'https://lplee.sites.northeastern.edu/math-3530-numerical-analysis/';

const FLOAT = { kind: 'float' as const, reason: 'this view is about rounding' };
/** Plain text (not TeX): ∞ for a singular A. */
const plain = (x: number) => (Number.isFinite(x) ? formatFloat(x, 4) : '∞');

/** §8.6 */
export function ConditioningView() {
  const { sign, logDelta, setLogDelta } = useLesson4Store();
  const view = useLesson4((s) => conditioningView(s.A));
  const near = attempt(() => nearCollinearView(logDelta, sign));
  const sweep = attempt(() => conditioningSweep(sign));

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="Introduction">
            The condition number measures how much a small relative error in the input can grow in the output: from 1 (perfect)
            to ∞ (singular).
          </Caption>
          {view.ok && <p>{view.value.explanation}</p>}
          {NUMERICAL_NOTES_URL ? (
            <a href={NUMERICAL_NOTES_URL} target="_blank" rel="noreferrer">
              Interested? See Lesson 8 of the numerical analysis notes
            </a>
          ) : (
            <p className="caption">More: the numerical analysis notes cited in the lesson (Lesson 8 there).</p>
          )}
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <section>
          <h3>
            This A <PrecisionBadge precision={FLOAT} />
          </h3>
          <p>
            cond(A) ≈ {plain(view.value.condA)} · cond(AᵀA) ≈ {plain(view.value.condAtA)}
          </p>
          <CheckList checks={[view.value.identity]} />
        </section>
      )}
      <section>
        <h3>Nearly collinear houses</h3>
        <Tex tex="X = \begin{bmatrix} 1 & 1 \\ 1 & 1+\delta \\ 1 & 1+2\delta \end{bmatrix},\quad y = (1, 2, 4)" display />
        <label className="sliders">
          <span>δ = 10^{logDelta}</span>
          <input type="range" min={LOG_DELTA_RANGE[0]} max={LOG_DELTA_RANGE[1]} step={0.25} value={logDelta} onChange={(e) => setLogDelta(Number(e.target.value))} />
        </label>
        {near.ok ? (
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Relative error</th>
                <th>Digits lost (of ~{near.value.digitsLost.available})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Normal equation (float LU on XᵀX)</td>
                <td>{near.value.normalError.toExponential(2)}</td>
                <td>≈ {near.value.digitsLost.normal.toFixed(1)}</td>
              </tr>
              <tr>
                <td>Householder QR</td>
                <td>{near.value.qrError.toExponential(2)}</td>
                <td>≈ {near.value.digitsLost.qr.toFixed(1)}</td>
              </tr>
            </tbody>
            <caption>cond(X) ≈ {near.value.condX.toExponential(2)}</caption>
          </table>
        ) : (
          <ViewNotice error={near.error} />
        )}
      </section>
      <section>
        <h3>Error against cond(X) as δ shrinks</h3>
        {sweep.ok ? (
          <Canvas2D bare fit={chartFit(sweep.value.frame)}>
            <Axes2D frame={sweep.value.frame}>
              {sweep.value.references.map((r) => (
                <SlopeLine key={r.label} slope={r.slope} through={r.through} color={r.color} label={r.label} />
              ))}
              {sweep.value.series.map((s) => (
                <group key={s.label}>
                  <FunctionPlot points={s.points} color={s.color} lineWidth={2} />
                  <Scatter points={s.points.map((p) => ({ at: p, color: s.color }))} />
                </group>
              ))}
            </Axes2D>
          </Canvas2D>
        ) : (
          <ViewNotice error={sweep.error} />
        )}
        {sweep.ok && (
          <ul className="legend">
            {sweep.value.series.map((s) => (
              <li key={s.label} style={{ color: s.color }}>
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </section>
    </ModuleLayout>
  );
}
