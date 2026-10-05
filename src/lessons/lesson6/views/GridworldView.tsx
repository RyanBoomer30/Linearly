import { Caption } from '../../../components/display/Caption';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridWorld } from '../../../components/diagram/GridWorld';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { ACTION_ARROWS, ACTIONS } from '../../../core/mdp';
import { NOTES_PLAN } from '../../../presets/lesson6';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { attempt } from '../../../store/useSystem';
import { actionMatrices, cellOf, gridCells, mdpSummary, samplePaths, transitionInspector } from '../models';
import { useLesson6 } from '../useLesson6';
import { Controls } from './Controls';
import { RobotSimulation } from './RobotSimulation';
import { selectedState } from './shared';

/** §10.1 */
export function GridworldView() {
  const { selectedCell, selectedAction, selectAction, clickCell, numberDisplay, seed, runs, setRuns } = useLesson6Store();
  const ctx = useLesson6((s) => ({ ...s, selected: selectedState(s.mdp, selectedCell) }), [selectedCell]);
  const selected = ctx.ok ? ctx.value.selected : null;
  const inspector = useLesson6((s) => (selected === null ? null : transitionInspector(s.mdp, selected, selectedAction, numberDisplay)), [selected, selectedAction, numberDisplay]);
  const cells = useLesson6(
    (s) => gridCells(s.mdp, { policy: s.policy, overlay: inspector.ok && inspector.value ? inspector.value.overlay : undefined }, numberDisplay),
    [inspector, numberDisplay],
  );
  const summary = useLesson6((s) => mdpSummary(s.mdp, s.spec.slip, numberDisplay), [numberDisplay]);
  const matrices = useLesson6((s) => actionMatrices(s.mdp, selected), [selected]);
  const paths = useLesson6((s) => samplePaths(s.mdp, s.mdp.start, NOTES_PLAN, runs, seed), [runs, seed]);
  const firstPath = useLesson6((s) => (paths.ok && paths.value.paths[0] ? paths.value.paths[0].states.map((st) => cellOf(s.mdp, st)) : undefined), [paths]);

  return (
    <ModuleLayout
      controls={
        <Controls showGrid>
          <Caption section="§6.1">
            The robot can be in any of the states except the gray square, and can move ←, →, ↑ or ↓. Each action sets
            the probabilities Pₛₐ(s′) of the next state; the reward R(s) depends only on the state.
          </Caption>
          <div className="segmented" role="group" aria-label="Action to inspect">
            {ACTIONS.map((a) => (
              <button key={a} type="button" className={selectedAction === a ? 'active' : undefined} onClick={() => selectAction(a)}>
                {ACTION_ARROWS[a]}
              </button>
            ))}
          </div>
          <p className="caption">Inspect mode: click a state, then pick an action, to see Pₛₐ(s′) on the grid.</p>
        </Controls>
      }
    >
      {!cells.ok && <ViewNotice error={cells.error} />}
      {cells.ok && <RobotSimulation stateCells={cells.value} selected={selectedCell} onCellClick={(c) => attempt(() => clickCell(c))} />}
      {cells.ok && (
        <div className="grid-layout">
          <GridWorld
            cells={cells.value}
            selected={selectedCell}
            onCellClick={(c) => attempt(() => clickCell(c))}
            path={firstPath.ok ? firstPath.value : undefined}
            caption="Editing view: the painted policy, Pₛₐ(s′) for the inspected state, and the first sample path in pink."
          />
          {summary.ok && (
            <ul className="mdp-summary">
              <li>
                <Tex tex={summary.value.statesTex} />
              </li>
              <li>
                <Tex tex={summary.value.actionsTex} />
              </li>
              <li>
                <Tex tex={summary.value.rewardTex} />
              </li>
              <li>{summary.value.transitionText}</li>
              <li>{summary.value.slipText}</li>
            </ul>
          )}
        </div>
      )}
      {inspector.ok && inspector.value && (
        <section>
          <h3>Where {ACTION_ARROWS[selectedAction]} can take the robot</h3>
          <ul className="transition-list">
            {inspector.value.entries.map((e) => (
              <li key={e.state}>
                <Tex tex={e.tex} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {!inspector.ok && <ViewNotice error={inspector.error} />}
      <section>
        <h3>The four transition matrices (rows: current state, columns: next state)</h3>
        {!matrices.ok && <ViewNotice error={matrices.error} />}
        {matrices.ok && (
          <div className="heatmap-row">
            {matrices.value.map((m) => (
              <MatrixHeatmap
                key={m.action}
                entries={m.entries}
                maxAbs={1}
                cellSize={14}
                caption={`P for ${ACTION_ARROWS[m.action]}`}
                outlined={m.highlightRow === null ? undefined : new Set(m.entries[0].map((_, j) => `${m.highlightRow},${j}`))}
              />
            ))}
          </div>
        )}
      </section>
      <section>
        <h3>Sample paths: the plan ↑ ↑ → from the start</h3>
        <label className="sliders">
          <span>Runs: {runs}</span>
          <input type="range" min={10} max={1000} step={10} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />
        </label>
        {!paths.ok && <ViewNotice error={paths.error} />}
        {paths.ok && (
          <>
            <p>{paths.value.caption}</p>
            <p className="caption">The pink trace is the first run.</p>
          </>
        )}
      </section>
    </ModuleLayout>
  );
}
