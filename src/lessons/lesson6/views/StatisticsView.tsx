import { useMemo } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Axes2D, chartFit, Scatter, Segment } from '../../../components/canvas/charts';
import { Caption } from '../../../components/display/Caption';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridEditor } from '../../../components/editor/GridEditor';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { MAX_STATS_ROWS, STATS_PRESETS, statsPresetById } from '../../../presets/lesson6';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { useStore } from '../../../store/useStore';
import { attempt } from '../../../store/useSystem';
import { columnColor } from '../../../theme/colors';
import { parseStatsTable, statisticsView, type ProductSign } from '../models';
import { NumberDisplayPicker } from './Controls';

const SIGN_COLORS: Record<ProductSign, string> = { 1: '#009E73', [-1]: '#D55E00', 0: '#71717a' };
const MEAN_COLOR = '#0072B2';

/** Statistics primer (beyond the Lesson 6 notes): sample mean, variance and covariance, the entries of Lesson 7's covariance matrix. */
export function StatisticsView() {
  const { statsCells, statsColumns, statsPresetId, setStatsCell, addStatsRow, removeStatsRow, loadStatsPreset, numberDisplay } = useLesson6Store();
  const setLesson = useStore((s) => s.setLesson);
  const table = useMemo(() => parseStatsTable(statsCells), [statsCells]);
  const view = useMemo(() => attempt(() => statisticsView(table.x1, table.x2, statsColumns, numberDisplay)), [table, statsColumns, numberDisplay]);
  const stepper = useStepper(view.ok ? view.value.steps.length : 0);
  const step = view.ok ? view.value.steps[stepper.index] : undefined;
  const preset = statsPresetId ? statsPresetById(statsPresetId) : undefined;

  const openCovarianceMatrix = () => {
    // Lesson 7's store loads with its lesson; only then switch its view.
    void import('../../../store/useLesson7Store').then(({ useLesson7Store }) => {
      useLesson7Store.getState().setView('covariance');
      setLesson(7);
    });
  };

  return (
    <ModuleLayout
      controls={
        <>
          <Caption section="Before §7.2">
            Lesson 7 builds the covariance matrix S from three numbers per pair of variables: their sample means, sample
            variances and covariance. This primer computes each one by hand.
          </Caption>
          <label className="preset-picker">
            Data{' '}
            <select value={statsPresetId ?? ''} onChange={(e) => loadStatsPreset(e.target.value)}>
              <option value="" disabled>
                Custom
              </option>
              {STATS_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <GridEditor
            label="Data (one row per observation)"
            cells={statsCells}
            onChange={setStatsCell}
            invalid={table.invalid}
            columnHeader={(j) => statsColumns[j]}
            columnColor={columnColor}
            onAddRow={addStatsRow}
            onRemoveRow={removeStatsRow}
            maxSize={MAX_STATS_ROWS}
          />
          {preset && <p className="caption">{preset.explanation}</p>}
          <NumberDisplayPicker />
        </>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <section>
            <h3>Mean, variance and covariance, one step at a time</h3>
            <StepperControls stepper={stepper} description={step?.description} tex={step?.tex} />
          </section>
          <section>
            <h3>The table behind the sums</h3>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>i</th>
                  <th style={{ color: columnColor(0) }}>x₁</th>
                  <th style={{ color: columnColor(1) }}>x₂</th>
                  <th>x₁ − x̄₁</th>
                  <th>x₂ − x̄₂</th>
                  <th>(x₁ − x̄₁)²</th>
                  <th>(x₂ − x̄₂)²</th>
                  <th>(x₁ − x̄₁)(x₂ − x̄₂)</th>
                </tr>
              </thead>
              <tbody>
                {view.value.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.x1}</td>
                    <td>{r.x2}</td>
                    <td>{r.d1}</td>
                    <td>{r.d2}</td>
                    <td>{r.sq1}</td>
                    <td>{r.sq2}</td>
                    <td style={{ color: SIGN_COLORS[r.sign] }}>{r.product}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Σ</th>
                  <th>{view.value.sums.x1}</th>
                  <th>{view.value.sums.x2}</th>
                  <th>{view.value.sums.d1}</th>
                  <th>{view.value.sums.d2}</th>
                  <th>{view.value.sums.sq1}</th>
                  <th>{view.value.sums.sq2}</th>
                  <th>{view.value.sums.product}</th>
                </tr>
              </tfoot>
              <caption>
                Divide the Σ row by n = {view.value.n} for the means, and the last three by n − 1 = {view.value.n - 1} for s₁², s₂² and
                Cov(x₁, x₂).
              </caption>
            </table>
          </section>
          <section>
            <h3>The sign of each product</h3>
            <Canvas2D bare fit={chartFit(view.value.frame)}>
              <Axes2D frame={view.value.frame}>
                <Segment
                  from={[view.value.meanPoint[0], view.value.frame.y.min]}
                  to={[view.value.meanPoint[0], view.value.frame.y.max]}
                  color={MEAN_COLOR}
                  dashed
                  lineWidth={1}
                />
                <Segment
                  from={[view.value.frame.x.min, view.value.meanPoint[1]]}
                  to={[view.value.frame.x.max, view.value.meanPoint[1]]}
                  color={MEAN_COLOR}
                  dashed
                  lineWidth={1}
                />
                <Scatter points={view.value.points.map((p, i) => ({ at: p, color: SIGN_COLORS[view.value.rows[i].sign] }))} />
              </Axes2D>
            </Canvas2D>
            <ul className="legend">
              <li style={{ color: MEAN_COLOR }}>dashed lines: x̄₁ and x̄₂</li>
              <li style={{ color: SIGN_COLORS[1] }}>product &gt; 0 (up-right or down-left of the means)</li>
              <li style={{ color: SIGN_COLORS[-1] }}>product &lt; 0 (up-left or down-right)</li>
              <li style={{ color: SIGN_COLORS[0] }}>product = 0 (on a mean line)</li>
            </ul>
            <p>{view.value.verdict}</p>
          </section>
          <section>
            <h3>Next: the covariance matrix</h3>
            <Tex tex={view.value.matrixTex} display />
            <p className="caption">
              Variances on the diagonal, the covariance off it. Lesson 7 writes S = XᵀX/(n − 1) for the centered data X and
              finds its eigenvectors: the principal components.
            </p>
            <div className="editor-buttons">
              <button type="button" onClick={openCovarianceMatrix}>
                Open Lesson 7 · Covariance matrix →
              </button>
            </div>
          </section>
        </>
      )}
    </ModuleLayout>
  );
}
