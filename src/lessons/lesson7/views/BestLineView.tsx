import { Caption } from '../../../components/display/Caption';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { attempt } from '../../../store/useSystem';
import { bestLineView, scatterView, type FittedLine, type Point } from '../models';
import { useLesson7 } from '../useLesson7';
import { PcaControls } from './PcaControls';
import { CheckList, Scatter2D, type ScatterLine } from './shared';

const linesOf = (l: FittedLine): ScatterLine[] => [
  { from: l.segment[0], to: l.segment[1], color: l.color, width: 3 },
  ...l.residuals.map(([a, b]) => ({ from: a, to: b, color: l.color, dashed: true, width: 1 })),
];

/** §11.7 */
export function BestLineView() {
  const { showReverseLine, setShowReverseLine, movePoint } = useLesson7Store();
  const view = useLesson7((s) => bestLineView(s.X, showReverseLine), [showReverseLine]);
  const points = useLesson7((s) => s.X.map((r) => [r[0].toNumber(), r[1].toNumber()] as Point));
  const frame = useLesson7(() => (points.ok ? scatterView(points.value, ['x₁ (age)', 'x₂ (height)']).frame : null), [points]);
  const lines = view.ok ? [view.value.regression, view.value.pca, ...(view.value.reverse ? [view.value.reverse] : [])] : [];

  return (
    <ModuleLayout
      controls={
        <PcaControls showStandardize={false}>
          <Caption section="§7.4">
            Both lines are &quot;best&quot;, measured differently: regression makes the vertical distances small, PCA the
            perpendicular ones. Drag the points to see when they agree.
          </Caption>
          <label>
            <input type="checkbox" checked={showReverseLine} onChange={(e) => setShowReverseLine(e.target.checked)} /> Also regress x₁ on x₂
            (beyond the notes)
          </label>
        </PcaControls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && points.ok && frame.ok && frame.value && (
        <>
          <Scatter2D frame={frame.value} points={points.value} lines={lines.flatMap(linesOf)} onDrag={(row, to) => attempt(() => movePoint(row, to))} />
          <ul className="legend">
            {lines.map((l) => (
              <li key={l.label} style={{ color: l.color }}>
                {l.label}: slope {l.slopeText}
              </li>
            ))}
          </ul>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Σ vertical distance²</th>
                <th>Σ perpendicular distance²</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.label}>
                  <td style={{ color: l.color }}>{l.label}</td>
                  <td>{l.verticalSse.toFixed(3)}</td>
                  <td>{l.perpendicularSse.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            <caption>Each line wins at its own measure.</caption>
          </table>
          {view.value.reverse && <CheckList checks={[view.value.between]} />}
          <p className="caption">{view.value.caption}</p>
        </>
      )}
    </ModuleLayout>
  );
}
