import { Caption } from '../../../components/display/Caption';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridWorld } from '../../../components/diagram/GridWorld';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { attempt } from '../../../store/useSystem';
import { bellmanDerivation, bellmanEquation, bellmanSystem, CONVENTION_NOTE, gridCells, returnView } from '../models';
import { useLesson6 } from '../useLesson6';
import { Controls } from './Controls';
import { DerivationStepper, LineChart, selectedState } from './shared';

/** §10.3 */
export function BellmanView() {
  const { selectedCell, clickCell, numberDisplay, seed, runs, setRuns, terminalMode, setEditMode, editMode } = useLesson6Store();
  const system = useLesson6((s) => bellmanSystem(s.mdp, s.policy, s.gamma, numberDisplay, terminalMode), [numberDisplay, terminalMode]);
  const cells = useLesson6(
    (s) => gridCells(s.mdp, { policy: s.policy, values: system.ok ? system.value.evaluation.V : undefined }, numberDisplay),
    [system, numberDisplay],
  );
  const equation = useLesson6(
    (s) => {
      const st = selectedState(s.mdp, selectedCell);
      return st === null ? null : bellmanEquation(s.mdp, s.policy, s.gamma, st, numberDisplay, terminalMode);
    },
    [selectedCell, numberDisplay, terminalMode],
  );
  const returns = useLesson6((s) => returnView(s.mdp, s.policy, s.gamma, s.mdp.start, runs, seed, terminalMode), [runs, seed, terminalMode]);
  const derivation = attempt(() => bellmanDerivation());
  const luSteps = system.ok ? system.value.luSteps : [];
  const stepper = useStepper(luSteps.length, system.ok ? system.value.matrix : null);

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§6.2">
            For a fixed policy π, V^π(s₀) = E[R(s₀) + γR(s₁) + γ²R(s₂) + ⋯]. One Bellman equation per state gives a system
            of n linear equations in the n values.
          </Caption>
          <div className="editor-buttons">
            <button type="button" className={editMode === 'policy' ? 'active' : undefined} onClick={() => setEditMode('policy')}>
              Paint arrows
            </button>
            <button type="button" className={editMode === 'inspect' ? 'active' : undefined} onClick={() => setEditMode('inspect')}>
              Show a state&apos;s equation
            </button>
          </div>
          <label className="sliders">
            <span>Runs: {runs}</span>
            <input type="range" min={10} max={5000} step={10} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />
          </label>
        </Controls>
      }
    >
      {!system.ok && <ViewNotice error={system.error} />}
      {system.ok && (
        <div className="panel-header">
          <PrecisionBadge precision={system.value.precision} />
        </div>
      )}
      {cells.ok && (
        <GridWorld cells={cells.value} selected={selectedCell} onCellClick={(c) => attempt(() => clickCell(c))} caption="V^π for the painted policy, on the scale −1 … +1." />
      )}
      {equation.ok && equation.value && (
        <section>
          <h3>This state&apos;s Bellman equation</h3>
          <Tex tex={equation.value} display />
        </section>
      )}
      <section>
        <h3>A sample run and the average over many</h3>
        {!returns.ok && <ViewNotice error={returns.error} />}
        {returns.ok && (
          <>
            <Tex tex={returns.value.termsTex} display />
            <p>
              Average over {runs} runs: {returns.value.average.toFixed(4)}
              {returns.value.exact !== null && <> · V^π(start) = {returns.value.exact.toFixed(4)}</>}
            </p>
            <LineChart
              frame={{
                x: { min: 1, max: Math.max(2, runs), title: 'runs' },
                y: { min: Math.min(-1, ...returns.value.runningMean.map((p) => p[1])), max: 1, title: 'running average' },
                size: 8,
                equalAspect: false,
              }}
              series={[{ label: 'Monte Carlo average', color: '#0072B2', points: returns.value.runningMean }]}
              curve={returns.value.exact !== null ? { points: [[1, returns.value.exact], [Math.max(2, runs), returns.value.exact]], label: 'V^π(start)' } : undefined}
            />
          </>
        )}
      </section>
      <section>
        <h3>From the definition to the Bellman equation</h3>
        {derivation.ok ? <DerivationStepper steps={derivation.value} /> : <ViewNotice error={derivation.error} />}
      </section>
      {system.ok && (
        <section>
          <h3>
            The whole system: <Tex tex="(I - \gamma P_\pi)V = R" />
          </h3>
          {system.value.systemTex ? (
            <Tex tex={system.value.systemTex} display />
          ) : (
            <div className="heatmap-row">
              <MatrixHeatmap entries={system.value.matrix} maxAbs={1} cellSize={20} caption="I − γP_π" />
              <MatrixHeatmap entries={system.value.rhs.map((x) => [x])} maxAbs={1} cellSize={20} caption="R" />
            </div>
          )}
          <p className="caption">{system.value.pivotNote}</p>
          {luSteps.length > 0 && (
            <StepperControls stepper={stepper} description={luSteps[stepper.index]?.description} tex={luSteps[stepper.index]?.tex} />
          )}
          <p className="caption">{CONVENTION_NOTE}</p>
        </section>
      )}
    </ModuleLayout>
  );
}
