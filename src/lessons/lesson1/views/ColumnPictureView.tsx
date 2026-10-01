import { useState } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Caption } from '../../../components/display/Caption';
import { PendingNotice } from '../../../components/display/PendingNotice';
import { Tex } from '../../../components/display/Tex';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { Rational } from '../../../core/rational';
import { useStore } from '../../../store/useStore';
import { columnColor } from '../../../theme/colors';
import { useSceneColors } from '../../../theme/useTheme';
import { columnPictureScene } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';
import { ColumnPictureContents } from './SceneContents';

/** §5.2 */
export function ColumnPictureView() {
  const n = useStore((s) => s.aCells[0]?.length ?? 0);
  const m = useStore((s) => s.aCells.length);
  const colors = useSceneColors();
  // Slider values as floats; converted to exact Rationals for the model.
  const [x, setX] = useState<number[]>(() => Array(n).fill(0));
  const scene = useViewModel((A, b) => columnPictureScene(A, b!, x.map(Rational.fromNumber)), [x]);
  const SceneCanvas = m === 2 ? Canvas2D : Canvas3D;

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§1.1">
            Column picture: Ax is a linear combination of the columns. Find the weights that reach b.
          </Caption>
          <div className="sliders">
            {Array.from({ length: n }, (_, j) => (
              <label key={j} style={{ color: columnColor(j) }}>
                x<sub>{j + 1}</sub> = {x[j]?.toFixed(2)}
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.1}
                  value={x[j] ?? 0}
                  onChange={(e) => setX((prev) => prev.map((v, k) => (k === j ? Number(e.target.value) : v)))}
                />
              </label>
            ))}
          </div>
          {/* TODO: Solve button (L1-C4), snapping sliders to exact values */}
          <button type="button" disabled>Solve</button>
          {scene.ok && (
            <div className="readout">
              <Tex tex={scene.value.expansionTex} display />
              <Tex tex={scene.value.combinationTex} display />
              <div>‖Ax − b‖ = {scene.value.distance.toFixed(3)} {scene.value.hit && <strong className="hit">Hit!</strong>}</div>
            </div>
          )}
        </Controls>
      }
    >
      {!scene.ok && <PendingNotice error={scene.error} />}
      <SceneCanvas>
        {scene.ok && <ColumnPictureContents scene={scene.value} resultColor={colors.result} targetColor={colors.target} />}
      </SceneCanvas>
    </ModuleLayout>
  );
}
