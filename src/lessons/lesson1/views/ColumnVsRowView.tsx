import { useState } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { useStore } from '../../../store/useStore';
import { Caption } from '../../../components/display/Caption';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { Point } from '../../../components/canvas/primitives';
import { Rational } from '../../../core/rational';
import { useSceneColors } from '../../../theme/useTheme';
import { freeParameterState, rowPictureScene } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls, SolutionMessage } from './Controls';
import { ColumnPictureContents, columnPictureFit, RowPictureContents, rowPictureFit } from './SceneContents';

/** §5.3: the column picture and row picture of the same system, linked by the free parameter t. */
export function ColumnVsRowView() {
  const colors = useSceneColors();
  const [t, setT] = useState(0);
  const m = useStore((s) => s.aCells.length);
  const n = useStore((s) => s.aCells[0]?.length ?? 0);
  const RowCanvas = n === 2 ? Canvas2D : Canvas3D;
  const ColumnCanvas = m === 2 ? Canvas2D : Canvas3D;
  const row = useViewModel((A, b) => rowPictureScene(A, b));
  const free = useViewModel((A, b) => freeParameterState(A, b, Rational.fromNumber(t)), [t]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§1.1">
            Moving t slides along the solution line in the row picture and changes the combination of columns.
          </Caption>
          {row.ok && (row.value.solution.kind === 'line' || row.value.solution.kind === 'plane') ? (
          <label className="slider-t">
            t = {t.toFixed(2)}
            <input type="range" min={-3} max={3} step={0.05} value={t} list="t-marks" onChange={(e) => setT(Number(e.target.value))} />
            <datalist id="t-marks">
              <option value={0} label="t = 0" />
              <option value={1} label="t = 1" />
            </datalist>
            <span className="caption">t = 0 and t = 1 are the two combinations from the notes.</span>
          </label>
          ) : (
            row.ok && <SolutionMessage marker={row.value.solution} dim={row.value.dim} />
          )}
        </Controls>
      }
    >
      {!row.ok && <ViewNotice error={row.error} />}
      {row.ok && !free.ok && <ViewNotice error={free.error} />}
      <div className="side-by-side">
        <figure>
          <figcaption>
            <strong>Column picture</strong> — x as weights on the columns of A
          </figcaption>
          <ColumnCanvas fit={free.ok ? columnPictureFit(free.value.columnScene) : undefined}>
            {free.ok && (
              <ColumnPictureContents scene={free.value.columnScene} resultColor={colors.result} targetColor={colors.target} />
            )}
          </ColumnCanvas>
        </figure>
        <figure>
          <figcaption>
            <strong>Row picture</strong> — x as the point where the equations meet
          </figcaption>
          <RowCanvas fit={row.ok ? rowPictureFit(row.value) : undefined}>
            {row.ok && <RowPictureContents scene={row.value} markerColor={colors.result} />}
            {free.ok && <Point position={free.value.rowPoint} color={colors.result} radius={0.18} />}
          </RowCanvas>
        </figure>
      </div>
    </ModuleLayout>
  );
}
