import { useRef } from 'react';
import { Caption } from '../../../components/display/Caption';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridWorld } from '../../../components/diagram/GridWorld';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { ACTION_ARROWS, ACTIONS, type Policy } from '../../../core/mdp';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { attempt } from '../../../store/useSystem';
import { actionCompass, cellOf, gridCells, intendedPath, optimalityDerivation, optimalView } from '../models';
import { useLesson6 } from '../useLesson6';
import { Controls } from './Controls';
import { DerivationStepper, selectedState } from './shared';

/** §10.5 */
export function OptimalView() {
  const { selectedCell, clickCell, numberDisplay, terminalMode, applyPolicy, setEditMode } = useLesson6Store();
  // L6-O5: arrows that changed since the last parameter change are highlighted.
  const previous = useRef<Policy | undefined>(undefined);
  const optimal = useLesson6((s) => optimalView(s.mdp, s.gamma, terminalMode, numberDisplay, previous.current), [terminalMode, numberDisplay]);
  if (optimal.ok) previous.current = optimal.value.policy;
  const selected = useLesson6((s) => selectedState(s.mdp, selectedCell), [selectedCell]);
  const from = selected.ok ? selected.value : null;
  const path = useLesson6((s) => (optimal.ok ? intendedPath(s.mdp, optimal.value.policy, from ?? s.mdp.start).map((st) => cellOf(s.mdp, st)) : undefined), [optimal, from]);
  const cells = useLesson6(
    (s) =>
      gridCells(
        s.mdp,
        optimal.ok ? { policy: optimal.value.policy, values: optimal.value.V, changed: optimal.value.changed, robotAt: from ?? s.mdp.start } : {},
        numberDisplay,
      ),
    [optimal, from, numberDisplay],
  );
  const compass = useLesson6((s) => (optimal.ok && from !== null ? actionCompass(s.mdp, optimal.value.V, from, numberDisplay) : null), [optimal, from, numberDisplay]);
  const derivation = attempt(() => optimalityDerivation());
  const mdp = useLesson6((s) => s.mdp);

  return (
    <ModuleLayout
      controls={
        <Controls showPainter={false}>
          <Caption section="§6.3">
            The optimal policy picks, in every state, the action a that maximizes Σ Pₛₐ(s′)V*(s′). It does not depend on
            where the robot starts: only the current state matters.
          </Caption>
          <button type="button" onClick={() => setEditMode('inspect')}>
            Place the robot (click a cell)
          </button>
          {optimal.ok && (
            <button type="button" onClick={() => mdp.ok && attempt(() => applyPolicy(mdp.value, optimal.value.policy))}>
              Paint π* as the policy
            </button>
          )}
        </Controls>
      }
    >
      {!optimal.ok && <ViewNotice error={optimal.error} />}
      {optimal.ok && (
        <div className="panel-header">
          <PrecisionBadge precision={optimal.value.precision} />
        </div>
      )}
      {cells.ok && (
        <GridWorld
          cells={cells.value}
          selected={selectedCell}
          path={path.ok ? path.value : undefined}
          onCellClick={(c) => attempt(() => clickCell(c))}
          caption="V* and π*, computed by policy iteration. Outlined arrows changed with the last parameter change; the pink trace follows π* from the robot."
        />
      )}
      {compass.ok && compass.value && (
        <section>
          <h3>Comparing the actions here</h3>
          <div className="compass">
            {ACTIONS.map((a) => (
              <div key={a} className={a === compass.value!.best ? `compass-${a} best` : `compass-${a}`}>
                {ACTION_ARROWS[a]} {compass.value!.values[a].label}
              </div>
            ))}
          </div>
          <Tex tex={compass.value.tex} display />
        </section>
      )}
      <section>
        <h3>The Bellman optimality equation</h3>
        {derivation.ok ? <DerivationStepper steps={derivation.value} /> : <ViewNotice error={derivation.error} />}
      </section>
    </ModuleLayout>
  );
}
