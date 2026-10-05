import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Axes2D, chartFit, FunctionPlot, Scatter } from '../../../components/canvas/charts';
import { Arrow, Label, Point } from '../../../components/canvas/primitives';
import { Caption } from '../../../components/display/Caption';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { T_RANGE } from '../../../presets/lesson5';
import { useLesson5Store } from '../../../store/useLesson5Store';
import { useSceneColors } from '../../../theme/useTheme';
import { componentsChart, componentsScene, componentsView } from '../models';
import { useLesson5 } from '../useLesson5';
import { CheckList, Controls } from './Controls';

/** §9.5 */
export function ComponentsView() {
  const { t, setT, logScale, setLogScale } = useLesson5Store();
  const colors = useSceneColors();
  const view = useLesson5((s) => componentsView(s.P, s.x0, t), [t]);
  const chart = useLesson5((s) => componentsChart(s.P, s.x0, T_RANGE[1], logScale), [logScale]);
  const scene = useLesson5((s) => (s.P.length === 3 ? componentsScene(s.P, s.x0, t) : null), [t]);
  const steps = view.ok ? view.value.steps : [];
  const stepper = useStepper(steps.length);
  const step = steps[stepper.index];

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§5.3">
            x₀ is separated into its eigenvector components, each component evolves separately, and they are collected
            together at time t: x(t) = c₁λ₁ᵗv₁ + c₂λ₂ᵗv₂ + c₃λ₃ᵗv₃.
          </Caption>
          <label className="sliders">
            <span>t = {t}</span>
            <input type="range" min={T_RANGE[0]} max={T_RANGE[1]} step={1} value={t} onChange={(e) => setT(Number(e.target.value))} />
          </label>
          <label>
            <input type="checkbox" checked={logScale} onChange={(e) => setLogScale(e.target.checked)} /> Log scale
          </label>
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <div className="panel-header">
            <PrecisionBadge precision={view.value.precision} />
          </div>
          <section>
            <h3>x₀ in the eigenvector basis (column picture)</h3>
            <Tex tex={view.value.combinationTex} display />
          </section>
          <section>
            <h3>
              Three steps: <Tex tex="V^{-1}x_0 \;\to\; \Lambda^t c \;\to\; V\Lambda^t c" />
            </h3>
            <StepperControls stepper={stepper} description={step?.description} tex={step?.tex} />
          </section>
          <section>
            <h3>At t = {t}</h3>
            <ul className="component-list">
              {view.value.components.map((c) => (
                <li key={c.index} style={{ color: c.color }}>
                  <Tex tex={c.tex} />
                </li>
              ))}
            </ul>
            <CheckList checks={[view.value.check]} />
            <p className="caption">{view.value.negativeNote}</p>
          </section>
        </>
      )}
      <section>
        <h3>Size of each component against t</h3>
        {!chart.ok && <ViewNotice error={chart.error} />}
        {chart.ok && (
          <>
            <Canvas2D bare fit={chartFit(chart.value.frame)}>
              <Axes2D frame={chart.value.frame}>
                {chart.value.series.map((s) => (
                  <group key={s.label}>
                    <FunctionPlot points={s.points} color={s.color} lineWidth={2} />
                    <Scatter points={s.points.map((p) => ({ at: p, color: s.color }))} />
                  </group>
                ))}
              </Axes2D>
            </Canvas2D>
            <ul className="legend">
              {chart.value.series.map((s) => (
                <li key={s.label} style={{ color: s.color }}>
                  {s.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <section>
        <h3>Tip to tail in ℝ³</h3>
        {!scene.ok && <ViewNotice error={scene.error} />}
        {scene.ok && !scene.value && <p className="caption">The ℝ³ picture needs 3 states.</p>}
        {scene.ok && scene.value && (
          <Canvas3D fit={[scene.value.total, ...scene.value.arrows.map((a) => a.to)]}>
            {scene.value.arrows.map((a) => (
              <group key={a.label}>
                <Arrow from={a.from} to={a.to} color={a.color} />
                <Label position={a.to} tex={a.label} color={a.color} />
              </group>
            ))}
            <Point position={scene.value.total} color={colors.result} />
            <Label position={scene.value.total} tex={`x(${t})`} color={colors.result} />
          </Canvas3D>
        )}
      </section>
    </ModuleLayout>
  );
}
