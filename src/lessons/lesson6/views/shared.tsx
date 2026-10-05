import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Axes2D, chartFit, FunctionPlot, Scatter, SlopeLine, type ChartFrame } from '../../../components/canvas/charts';
import { Tex } from '../../../components/display/Tex';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { stateAt, type GridCell, type Mdp } from '../../../core/mdp';
import { attempt } from '../../../store/useSystem';
import type { Lesson6Step } from '../models';

/** The state at the selected cell, or null (none selected, a wall, or the MDP did not build). */
export function selectedState(mdp: Mdp | null, cell: GridCell | null): number | null {
  if (!mdp || !cell) return null;
  const s = attempt(() => stateAt(mdp, cell));
  return s.ok ? s.value : null;
}

/** L6-B3, L6-O1: a derivation played one line at a time, all lines so far shown. */
export function DerivationStepper({ steps }: { steps: Lesson6Step[] }) {
  const stepper = useStepper(steps.length);
  return (
    <div className="derivation">
      <StepperControls stepper={stepper} description={steps[stepper.index]?.description} />
      <ol>
        {steps.slice(0, stepper.index + 1).map((s, i) => (
          <li key={i} className={i === stepper.index ? 'current' : undefined}>
            <Tex tex={s.tex} display />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A small chart: series as lines with points, plus an optional reference line (log–log) or curve. */
export function LineChart({
  frame,
  series,
  slope,
  curve,
}: {
  frame: ChartFrame;
  series: { label: string; color: string; points: [number, number][] }[];
  slope?: { slope: number; through: [number, number]; label: string };
  curve?: { points: [number, number][]; label: string };
}) {
  return (
    <>
      <Canvas2D bare fit={chartFit(frame)}>
        <Axes2D frame={frame}>
          {slope && <SlopeLine slope={slope.slope} through={slope.through} color="#71717a" label={slope.label} />}
          {curve && <FunctionPlot points={curve.points} color="#71717a" lineWidth={1} />}
          {series.map((s) => (
            <group key={s.label}>
              <FunctionPlot points={s.points} color={s.color} lineWidth={2} />
              <Scatter points={s.points.map((p) => ({ at: p, color: s.color }))} />
            </group>
          ))}
        </Axes2D>
      </Canvas2D>
      <ul className="legend">
        {series.map((s) => (
          <li key={s.label} style={{ color: s.color }}>
            {s.label}
          </li>
        ))}
        {curve && <li style={{ color: '#71717a' }}>{curve.label}</li>}
      </ul>
    </>
  );
}
