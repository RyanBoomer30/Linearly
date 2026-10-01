import { useState } from 'react';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Caption } from '../../../components/display/Caption';
import { PendingNotice } from '../../../components/display/PendingNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { Point } from '../../../components/canvas/primitives';
import { Rational } from '../../../core/rational';
import { useSceneColors } from '../../../theme/useTheme';
import { freeParameterState, rowPictureScene } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';
import { ColumnPictureContents, RowPictureContents } from './SceneContents';

/** §5.3: row and column pictures for the same system, linked by the free parameter t. */
export function SideBySideView() {
  const colors = useSceneColors();
  const [t, setT] = useState(0);
  const row = useViewModel((A, b) => rowPictureScene(A, b!));
  const free = useViewModel((A, b) => freeParameterState(A, b!, Rational.fromNumber(t)), [t]);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§1.1">
            Moving t slides along the solution line in the row picture and changes the combination of columns.
          </Caption>
          {/* TODO: only show when the system has a free variable (L1-S2) */}
          <label className="slider-t">
            t = {t.toFixed(2)}
            <input type="range" min={-3} max={3} step={0.05} value={t} list="t-marks" onChange={(e) => setT(Number(e.target.value))} />
            <datalist id="t-marks">
              <option value={0} label="t = 0" />
              <option value={1} label="t = 1" />
            </datalist>
          </label>
        </Controls>
      }
    >
      {!row.ok && <PendingNotice error={row.error} />}
      {row.ok && !free.ok && <PendingNotice error={free.error} />}
      <div className="side-by-side">
        <Canvas3D>
          {row.ok && <RowPictureContents scene={row.value} markerColor={colors.result} />}
          {free.ok && <Point position={free.value.rowPoint} color={colors.result} radius={0.18} />}
        </Canvas3D>
        <Canvas3D>
          {free.ok && (
            <ColumnPictureContents scene={free.value.columnScene} resultColor={colors.result} targetColor={colors.target} />
          )}
        </Canvas3D>
      </div>
    </ModuleLayout>
  );
}
