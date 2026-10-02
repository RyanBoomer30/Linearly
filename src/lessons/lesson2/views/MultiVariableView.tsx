import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Num } from '../../../components/display/Num';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useDataStore } from '../../../store/useDataStore';
import { attempt } from '../../../store/useSystem';
import { currentTheta, dataPlotScene, designMatrixBuilder, polynomialView, toggleTerm } from '../models';
import { useLessonData, useLessonDataRoot } from '../useLessonData';
import { Controls } from './Controls';
import { DataPlot } from './DataPlot';
import { ModelComparisonTable } from './ModelComparisonTable';

/** §6.6 */
export function MultiVariableView() {
  const theta = useDataStore((s) => s.theta);
  const setModel = useDataStore((s) => s.setModel);
  const data = useLessonDataRoot();
  const builder = useLessonData((d) => designMatrixBuilder(d));
  const poly = useLessonData((d) => polynomialView(d));
  const plot = useLessonData((d) => dataPlotScene(d, currentTheta(d, theta)), [theta]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§2.3–2.4">
            More features, powers of x, cross terms: each is just another column of X.
          </Caption>
          <section>
            <h3>Design matrix builder</h3>
            {builder.ok ? (
              <div className="term-options" role="group" aria-label="Terms of the model">
                {builder.value.options.map((o) => (
                  <label key={o.label} className="chip-check">
                    <input
                      type="checkbox"
                      checked={o.active}
                      onChange={() => {
                        if (!data.ok) return;
                        const terms = attempt(() => toggleTerm(data.value.spec, o.term));
                        if (terms.ok) setModel({ kind: 'custom', terms: terms.value });
                      }}
                    />{' '}
                    <Tex tex={o.tex} />
                  </label>
                ))}
              </div>
            ) : (
              <ViewNotice error={builder.error} />
            )}
            {/* Notes §2.3: each θᵢ goes with one column; θ₀ with the constant column. */}
            {builder.ok && (
              <ul className="checks">
                {builder.value.parameters.map((p) => (
                  <li key={p.tex}>
                    <Tex tex={p.tex} /> ↔ column {p.columnLabel}
                    {p.feature ? ` (${p.feature})` : ' (constant)'}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {/* L2-M2: polynomial degree slider, one feature only. */}
          {poly.ok && (
            <section>
              <h3>Polynomial degree</h3>
              <label className="sliders">
                <span>d = {poly.value.degree}</span>
                <input
                  type="range"
                  min={0}
                  max={poly.value.maxDegree}
                  step={1}
                  value={poly.value.degree}
                  onChange={(e) => setModel({ kind: 'polynomial', degree: Number(e.target.value) })}
                />
              </label>
              <p>
                Mean RSS = {poly.value.meanRss ? <Num value={poly.value.meanRss} /> : 'singular'}
                {poly.value.exactFit && <span className="hit"> — the curve passes through every point.</span>}
              </p>
              <p className="caption">
                More parameters fit the data more closely. Try the "Curved data" preset: a straight line underfits it.
              </p>
            </section>
          )}
        </Controls>
      }
    >
      {builder.ok && <Tex tex={builder.value.XTex} display />}
      {plot.ok ? (
        <DataPlot scene={plot.value} residuals />
      ) : (
        <>
          <ViewNotice error={plot.error} />
          {/* L2-M5: too large to draw — still show X, the normal equation, and θ*. */}
          {data.ok && (
            <div className="readout">
              <MatrixTex entries={data.value.design.X.map((r) => r.map((x) => x.toTex()))} />
              <Tex tex="X^TX\theta^* = X^TY" display />
              {data.value.fit.xHat && (
                <Tex tex={`\\theta^* = (${data.value.fit.xHat.map((x) => x.toTex()).join(', ')})`} display />
              )}
            </div>
          )}
        </>
      )}
      <aside className="callout">
        <strong>Still linear.</strong> The columns of X can be nonlinear functions of x, but Xθ = Y is linear in θ — so the
        projection, the normal equation, and the loss all work unchanged.
      </aside>
      <ModelComparisonTable />
    </ModuleLayout>
  );
}
