import { useEffect, useRef, useState } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Axes2D, Axes3D, chartFit, ChartDragHandle, FunctionPlot, Heatmap, Scatter, SurfacePlot } from '../../../components/canvas/charts';
import { Caption } from '../../../components/display/Caption';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useDataStore } from '../../../store/useDataStore';
import { attempt } from '../../../store/useSystem';
import { MODEL_COLOR, RESIDUAL_COLOR, SUBSPACE_COLORS } from '../../../theme/colors';
import {
  currentTheta,
  dataPlotScene,
  lineHandles,
  lossLandscape,
  lossView,
  snapPath,
  thetaControls,
  thetaFromHandles,
  type LossLandscape,
} from '../models';
import { useLessonData, useLessonDataRoot } from '../useLessonData';
import { Controls } from './Controls';
import { DataPlot } from './DataPlot';
import { ModelComparisonTable } from './ModelComparisonTable';
import { ThetaSliders } from './ThetaSliders';

/** §6.5 */
export function LossExplorerView() {
  const theta = useDataStore((s) => s.theta);
  const setTheta = useDataStore((s) => s.setTheta);
  const [squares, setSquares] = useState(false);
  const [surface3D, setSurface3D] = useState(false);
  const data = useLessonDataRoot();
  const controls = useLessonData((d) => thetaControls(d, theta), [theta]);
  // Squares need equal axis scales so their areas are honest (L2-L1).
  const plot = useLessonData((d) => dataPlotScene(d, currentTheta(d, theta), { equalAspect: squares }), [theta, squares]);
  const loss = useLessonData((d) => lossView(d, currentTheta(d, theta)), [theta]);
  const handles = useLessonData((d) => lineHandles(d, currentTheta(d, theta)), [theta]);
  const landscape = useLessonData((d) => lossLandscape(d));
  const [snapError, setSnapError] = useState<string | null>(null);
  const animation = useRef<number | null>(null);

  useEffect(() => () => void (animation.current && cancelAnimationFrame(animation.current)), []);

  // L2-L5: animate θ to θ*.
  const snapToBest = () => {
    if (!data.ok) return;
    const path = attempt(() => snapPath(currentTheta(data.value, theta), currentTheta(data.value, null), 30));
    if (!path.ok) {
      setSnapError(path.error);
      return;
    }
    let k = 0;
    const tick = () => {
      if (k >= path.value.length) {
        setTheta(null);
        return;
      }
      setTheta(path.value[k++]);
      animation.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const openInLesson1 = useDataStore((s) => s.openInLesson1);
  const openLesson1 = (view: 'projection' | 'normal') => {
    if (!data.ok) return;
    const r = attempt(() => openInLesson1(data.value.design.X, data.value.design.Y, view));
    if (!r.ok) setSnapError(r.error);
  };

  const dragHandle = (k: 0 | 1, at: [number, number]) => {
    if (!handles.ok) return;
    const next = handles.value.map((h, i) => (i === k ? at : h)) as typeof handles.value;
    const t = attempt(() => thetaFromHandles(next));
    if (t.ok) setTheta(t.value);
  };

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§2.3">
            The "squares" in least squares: θ* makes the sum of squared vertical errors as small as possible.
          </Caption>
          {controls.ok ? <ThetaSliders controls={controls.value} /> : <ViewNotice error={controls.error} />}
          <button type="button" onClick={snapToBest}>
            Snap to best
          </button>
          {data.ok && (
            <p className="caption">
              Why θ* is the bottom of the bowl:{' '}
              <button type="button" className="link-button" onClick={() => openLesson1('projection')}>
                the projection of Y onto C(X)
              </button>{' '}
              and{' '}
              <button type="button" className="link-button" onClick={() => openLesson1('normal')}>
                the normal equation
              </button>{' '}
              (Lesson 1).
            </p>
          )}
          {snapError && <ViewNotice error={snapError} />}
          <label>
            <input type="checkbox" checked={squares} onChange={(e) => setSquares(e.target.checked)} /> Show squared errors as
            areas
          </label>
          {loss.ok ? (
            <div className="readout">
              {/* Notes §2.3: Y − Xθ read by rows. */}
              {loss.value.residualRows.map((r, k) => (
                <div key={k}>
                  <Tex tex={r.tex} display />
                  {r.reason && <span className="caption">{r.reason}</span>}
                </div>
              ))}
              {loss.value.terms.map((t) => (
                <Tex key={t.row} tex={`\\textcolor{${t.color}}{${t.tex}}`} />
              ))}
              <Tex tex={`\\|Y - X\\theta\\|^2 = ${loss.value.loss.toFixed(4)}`} display />
              <div>Mean RSS = {loss.value.meanRss.toFixed(4)}</div>
            </div>
          ) : (
            <ViewNotice error={loss.error} />
          )}
        </Controls>
      }
    >
      {!plot.ok && <ViewNotice error={plot.error} />}
      <div className="side-by-side">
        <figure>
          <figcaption>Drag the line or the θ sliders</figcaption>
          {plot.ok && (
            <DataPlot scene={plot.value} residuals squares={squares}>
              {handles.ok && plot.value.dim === 2 && (
                <>
                  <ChartDragHandle at={handles.value[0]} color={MODEL_COLOR} onDrag={(p) => dragHandle(0, p)} />
                  <ChartDragHandle at={handles.value[1]} color={MODEL_COLOR} onDrag={(p) => dragHandle(1, p)} />
                </>
              )}
            </DataPlot>
          )}
        </figure>
        <figure>
          <figcaption>
            Loss landscape{' '}
            {landscape.ok && landscape.value.kind === 'heatmap' && (
              <label>
                <input type="checkbox" checked={surface3D} onChange={(e) => setSurface3D(e.target.checked)} /> 3D surface
              </label>
            )}
          </figcaption>
          {landscape.ok ? (
            <Landscape scene={landscape.value} theta={data.ok ? currentTheta(data.value, theta) : null} surface3D={surface3D} />
          ) : (
            <ViewNotice error={landscape.error} />
          )}
        </figure>
      </div>
      <ModelComparisonTable />
    </ModuleLayout>
  );
}

/** L2-L3 / L2-L4: the loss as a bowl over (θ₀, θ₁), or a parabola in θ. */
function Landscape({ scene, theta, surface3D }: { scene: LossLandscape; theta: number[] | null; surface3D: boolean }) {
  const setTheta = useDataStore((s) => s.setTheta);
  if (scene.kind === 'none') return <ViewNotice error={scene.reason} />;
  if (scene.kind === 'parabola') {
    return (
      <Canvas2D bare fit={chartFit(scene.frame)}>
        <Axes2D frame={scene.frame}>
          <FunctionPlot points={scene.curve} color={RESIDUAL_COLOR} />
          <Scatter points={[{ at: [scene.thetaStar, Math.min(...scene.curve.map((p) => p[1]))], color: SUBSPACE_COLORS.column, label: 'θ*' }]} />
          {theta && <ChartDragHandle at={[theta[0], scene.frame.y.min]} color={MODEL_COLOR} onDrag={([t]) => setTheta([t])} />}
        </Axes2D>
      </Canvas2D>
    );
  }
  if (surface3D) {
    return (
      <Canvas3D bare fit={chartFit(scene.surfaceFrame)}>
        <Axes3D frame={scene.surfaceFrame}>
          <SurfacePlot grid={scene.grid} color={RESIDUAL_COLOR} />
        </Axes3D>
      </Canvas3D>
    );
  }
  return (
    <Canvas2D bare fit={chartFit(scene.frame)}>
      <Axes2D frame={scene.frame}>
        <Heatmap
          grid={scene.grid}
          minimum={scene.thetaStar}
          marker={theta ? [theta[0], theta[1]] : undefined}
          onMarkerDrag={(t) => setTheta(t)}
        />
      </Axes2D>
    </Canvas2D>
  );
}
