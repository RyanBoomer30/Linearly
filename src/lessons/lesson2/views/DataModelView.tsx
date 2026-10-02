import { useState } from 'react';
import { ChartDragHandle, Segment } from '../../../components/canvas/charts';
import { Caption } from '../../../components/display/Caption';
import { Num } from '../../../components/display/Num';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { Rational } from '../../../core/rational';
import type { ModelChoice } from '../../../core/regression';
import { useDataStore } from '../../../store/useDataStore';
import { MODEL_COLOR } from '../../../theme/colors';
import { currentTheta, dataModelView, dataPlotScene, predict, type VocabId } from '../models';
import { useLessonData } from '../useLessonData';
import { Controls } from './Controls';
import { DataPlot } from './DataPlot';

const COMPARE_MODELS: ModelChoice[] = [{ kind: 'origin' }, { kind: 'line' }];

/** §6.1 */
export function DataModelView() {
  const theta = useDataStore((s) => s.theta);
  const featureCount = useDataStore((s) => s.columns.length - 1);
  const view = useLessonData((d) => dataModelView(d));
  // Notes §2.2 figure: the best line through the origin against the best line with an intercept.
  const [compare, setCompare] = useState(false);
  const plot = useLessonData(
    (d) => dataPlotScene(d, currentTheta(d, theta), compare ? { compareWith: COMPARE_MODELS } : {}),
    [theta, compare],
  );
  const [vocab, setVocab] = useState<VocabId | null>(null);
  const [xText, setXText] = useState('2');
  const x = Rational.parse(xText);
  const prediction = useLessonData((d) => (x ? predict(d, x) : null), [xText]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§2.1">
            Regression: from paired data (x⁽ⁱ⁾, y⁽ⁱ⁾), learn a predictor h so that h(x) is close to y.
          </Caption>
          {view.ok && (
            <div className="readout">
              <Tex tex={view.value.fittedTex} display />
              {view.value.roundingNote && <p className="caption">{view.value.roundingNote}</p>}
            </div>
          )}
          <label>
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Compare h(x) = θx
            with h(x) = θ₀ + θ₁x
          </label>
          {featureCount === 1 && (
            <section className="predict">
              <h3>Predict</h3>
              <label className="inline-field">
                New x{' '}
                <input className="cell" value={xText} onChange={(e) => setXText(e.target.value)} aria-invalid={!x} />
              </label>
              {prediction.ok && prediction.value && (
                <p>
                  <Tex tex={prediction.value.tex} /> ≈ <Num value={prediction.value.y} />
                </p>
              )}
              {!prediction.ok && <p className="caption">{prediction.error}</p>}
            </section>
          )}
        </Controls>
      }
    >
      {!plot.ok && <ViewNotice error={plot.error} />}
      {plot.ok && plot.value.overlays.length > 0 && (
        <ul className="legend">
          {plot.value.overlays.map((o) => (
            <li key={o.label} style={{ color: o.color }}>
              <Tex tex={o.formulaTex} /> — {o.label}
            </li>
          ))}
        </ul>
      )}
      {plot.ok && (
        <DataPlot scene={plot.value}>
          {prediction.ok && prediction.value && plot.value.dim === 2 && (
            <>
              <Segment
                from={[prediction.value.x.toNumber(), plot.value.frame.y.min]}
                to={[prediction.value.x.toNumber(), prediction.value.y.toNumber()]}
                color={MODEL_COLOR}
                dashed
              />
              {/* L2-D5: drag the marker along the x-axis to choose x. */}
              <ChartDragHandle
                at={[prediction.value.x.toNumber(), plot.value.frame.y.min]}
                color={MODEL_COLOR}
                onDrag={([nx]) => setXText(String(+nx.toFixed(2)))}
              />
            </>
          )}
        </DataPlot>
      )}
      <section>
        <h3>Vocabulary</h3>
        {view.ok ? (
          <dl className="vocab-list">
            {view.value.vocabulary.map((v) => (
              <div
                key={v.id}
                className={v.id === vocab ? 'vocab-term active' : 'vocab-term'}
                onMouseEnter={() => setVocab(v.id)}
                onMouseLeave={() => setVocab(null)}
                onFocus={() => setVocab(v.id)}
                onBlur={() => setVocab(null)}
                tabIndex={0}
              >
                <dt>
                  {v.term} <Tex tex={v.tex} />
                </dt>
                <dd>{v.meaning}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <ViewNotice error={view.error} />
        )}
        {/* TODO(L2-D4): highlight what the hovered term names (table column, plot curve, a point). */}
      </section>
    </ModuleLayout>
  );
}
