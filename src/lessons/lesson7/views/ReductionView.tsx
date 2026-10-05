import { useEffect, useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { dataRowColor } from '../../../theme/colors';
import { reductionView, regressionComparison, scatterView, type Point } from '../models';
import { useLesson7 } from '../useLesson7';
import { PcaControls, SignControls } from './PcaControls';
import { CheckList, Scatter2D } from './shared';

const rotate = ([x, y]: Point, a: number): Point => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** §11.4 */
export function ReductionView() {
  const { standardize, sign, flipV1, regressionRevealed, revealRegression } = useLesson7Store();
  const view = useLesson7((s) => reductionView(s.X, { standardize, sign, flipV1 }), [standardize, sign, flipV1]);
  const regression = useLesson7((s) => regressionComparison(s.X, s.y, { sign, flipV1 }), [sign, flipV1]);
  const table = useLesson7((s) => s.X.map((r) => [r[0].toNumber(), r[1].toNumber()] as Point));
  // L7-D2: rotate the original axes onto the components, t from 0 to 1.
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (t >= 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setT((x) => Math.min(1, x + 0.04)), 40);
    return () => window.clearTimeout(id);
  }, [playing, t]);
  const rotated = view.ok && table.ok ? table.value.map((p) => rotate(p, -view.value.angle * t)) : [];
  const frame = useLesson7(() => (table.ok ? scatterView(table.value, ['x₁', 'x₂']).frame : null), [table]);
  const reach = frame.ok && frame.value ? frame.value.x.max : 10;

  return (
    <ModuleLayout
      controls={
        <PcaControls>
          <Caption section="§7.1">
            Replace the two correlated columns by one new variable z₁ = Xv₁, reducing the dimension from 2 to 1. The second,
            z₂ = Xv₂, carries what is left.
          </Caption>
          <SignControls />
        </PcaControls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && table.ok && (
        <>
          <section>
            <h3>New variables</h3>
            <Tex tex={view.value.formulas[0]} display />
            <Tex tex={view.value.formulas[1]} display />
            <table className="comparison-table pca-table">
              <thead>
                <tr>
                  <th>x₁</th>
                  <th>x₂</th>
                  <th className="derived">z₁ (derived)</th>
                  <th className="derived">z₂ (derived)</th>
                </tr>
              </thead>
              <tbody>
                {table.value.map((p, i) => (
                  <tr key={i} style={{ color: dataRowColor(i) }}>
                    <td>{p[0]}</td>
                    <td>{p[1]}</td>
                    <td className="derived">{view.value.scores[i][0].toFixed(4)}</td>
                    <td className="derived">{view.value.scores[i][1].toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="caption">{view.value.notesCorrection}</p>
          </section>
          <section>
            <h3>Rotating to the new axes</h3>
            {frame.ok && frame.value && (
              <Scatter2D
                frame={frame.value}
                points={rotated}
                lines={[
                  { from: rotate([-reach, 0], view.value.angle * (1 - t)), to: rotate([reach, 0], view.value.angle * (1 - t)), color: '#0072B2', label: 'v₁' },
                ]}
              />
            )}
            <div className="editor-buttons">
              <button type="button" onClick={() => { setT(0); setPlaying(true); }}>
                Rotate onto (z₁, z₂)
              </button>
              <button type="button" onClick={() => { setPlaying(false); setT(0); }}>
                Back to (x₁, x₂)
              </button>
            </div>
            <p className="caption">At the end of the rotation each point&apos;s coordinates are its (z₁, z₂).</p>
          </section>
          <section>
            <h3>Keeping only z₁: the rank-1 reduction</h3>
            {frame.ok && frame.value && (
              <Scatter2D
                frame={frame.value}
                points={table.value}
                lines={[
                  { from: [-reach * Math.cos(view.value.angle), -reach * Math.sin(view.value.angle)], to: [reach * Math.cos(view.value.angle), reach * Math.sin(view.value.angle)], color: '#0072B2' },
                  ...table.value.map((p, i) => ({ from: p, to: view.value.projected[i], color: '#D55E00', dashed: true, width: 1 })),
                ]}
              />
            )}
            <p className="caption">Each point dropped perpendicularly onto the v₁ line: these are the rows of σ₁u₁v₁ᵀ = Xv₁v₁ᵀ.</p>
          </section>
        </>
      )}
      <section>
        <h3>Regression on the components (homework)</h3>
        {!regression.ok && <ViewNotice error={regression.error} />}
        {regression.ok &&
          (regressionRevealed ? (
            <>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>θ</th>
                    <th>Mean RSS</th>
                  </tr>
                </thead>
                <tbody>
                  {regression.value.rows.map((r) => (
                    <tr key={r.model}>
                      <td>
                        <Tex tex={r.model} />
                      </td>
                      <td>{r.thetaText}</td>
                      <td>{r.meanRss.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <CheckList checks={[regression.value.samePredictions]} />
            </>
          ) : (
            <p>
              The notes leave these regressions as homework.{' '}
              <button type="button" onClick={revealRegression}>
                Reveal the results
              </button>
            </p>
          ))}
      </section>
    </ModuleLayout>
  );
}
