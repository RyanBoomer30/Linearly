import { useEffect, useRef, useState } from 'react';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridWorld, type GridCellView } from '../../../components/diagram/GridWorld';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import type { GridCell } from '../../../core/mdp';
import { NOTES_PLAN } from '../../../presets/lesson6';
import { useLesson6Store } from '../../../store/useLesson6Store';
import { cellOf, gridCells, robotSimulation } from '../models';
import { useLesson6 } from '../useLesson6';

/** The left picture shows only the state numbers, as in the notes. */
const numbersOnly = (cells: GridCellView[][]) =>
  cells.map((row) => row.map((c) => ({ ...c, reward: undefined, robot: false, terminal: false, arrow: null, value: null, valueLabel: undefined, q: null })));

interface RobotSimulationProps {
  /** The left (numbered) picture, with whatever overlay the view adds (e.g. Pₛₐ(s′)). */
  stateCells: GridCellView[][];
  selected?: GridCell | null;
  onCellClick?: (cell: GridCell) => void;
}

/**
 * The notes' §6.1 figure as a simulation: the numbered states on the left, and
 * on the right the world with +1, −1 and the robot ⌘, which moves one step at a
 * time and sometimes slips (L6-G6). Each run uses the next seed, so a run can be
 * replayed exactly.
 */
export function RobotSimulation({ stateCells, selected, onCellClick }: RobotSimulationProps) {
  const { seed, simSource, setSimSource, numberDisplay } = useLesson6Store();
  const [run, setRun] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [tally, setTally] = useState({ plus: 0, minus: 0, other: 0 });
  const recorded = useRef(new Set<string>());
  const runSeed = seed + run;

  const sim = useLesson6(
    (s) => robotSimulation(s.mdp, simSource === 'plan' ? { kind: 'plan', actions: NOTES_PLAN } : { kind: 'policy', policy: s.policy }, s.gamma, runSeed),
    [simSource, runSeed],
  );
  const frames = sim.ok ? sim.value.frames : [];
  const runKey = `${simSource}:${runSeed}`;
  const stepper = useStepper(frames.length, runKey);
  const frame = frames[stepper.index];

  // "Run again" starts playing once the new run's frames are in (after the stepper resets).
  useEffect(() => {
    if (autoplay && frames.length > 1) {
      stepper.togglePlay();
      setAutoplay(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames]);

  // Count each run once, when it has been watched to the end.
  const endReward = useLesson6((s) => (sim.ok && sim.value.endedAt !== null ? s.mdp.R[sim.value.endedAt].toNumber() : 0), [sim]);
  useEffect(() => {
    if (!sim.ok || frames.length === 0 || stepper.index !== frames.length - 1 || recorded.current.has(runKey)) return;
    recorded.current.add(runKey);
    const reward = endReward.ok ? endReward.value : 0;
    setTally((t) => (reward > 0 ? { ...t, plus: t.plus + 1 } : reward < 0 ? { ...t, minus: t.minus + 1 } : { ...t, other: t.other + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepper.index, frames]);

  const world = useLesson6(
    (s) => {
      return {
        cells: gridCells(s.mdp, { robotAt: null }, numberDisplay),
        robot: frame
          ? {
              at: cellOf(s.mdp, frame.state),
              aimed: frame.slipped && frame.aimed !== null ? cellOf(s.mdp, frame.aimed) : null,
              label: frame.slipped ? 'slipped' : undefined,
            }
          : null,
        path: frames.slice(0, stepper.index + 1).map((f) => cellOf(s.mdp, f.state)),
      };
    },
    [frames, stepper.index, numberDisplay],
  );

  const runAgain = () => {
    setRun((k) => k + 1);
    setAutoplay(true);
  };
  const switchSource = (source: 'plan' | 'policy') => {
    setSimSource(source);
    setTally({ plus: 0, minus: 0, other: 0 });
  };

  return (
    <section className="robot-sim">
      <h3>The robot problem</h3>
      <div className="robot-sim-panels">
        <GridWorld cells={numbersOnly(stateCells)} notes selected={selected} onCellClick={onCellClick} caption="The 11 states (click one to inspect it)." />
        {world.ok ? (
          <GridWorld cells={world.value.cells} notes labels="none" robot={world.value.robot} path={world.value.path} caption="Rewards and the robot ⌘." />
        ) : (
          <ViewNotice error={world.error} />
        )}
      </div>
      <div className="segmented" role="group" aria-label="What the robot does">
        <button type="button" className={simSource === 'plan' ? 'active' : undefined} onClick={() => switchSource('plan')}>
          The notes&apos; plan ↑ ↑ →
        </button>
        <button type="button" className={simSource === 'policy' ? 'active' : undefined} onClick={() => switchSource('policy')}>
          Follow the painted policy
        </button>
      </div>
      {!sim.ok && <ViewNotice error={sim.error} />}
      {sim.ok && (
        <>
          <StepperControls stepper={stepper} />
          <p className="robot-sim-step" aria-live="polite">
            {frame?.description}
          </p>
          {frame && <Tex tex={frame.tex} display />}
          <div className="editor-buttons">
            <button type="button" onClick={runAgain}>
              Run again
            </button>
            {/* The outcome waits until the run has been watched to the end. */}
            <span className="caption">{stepper.index === frames.length - 1 ? sim.value.caption : `Seed ${runSeed}`}</span>
          </div>
          <div className="robot-sim-tally" aria-label="Runs watched to the end">
            <span>Reached +1: {tally.plus}</span>
            <span>Fell into −1: {tally.minus}</span>
            <span>Neither: {tally.other}</span>
          </div>
        </>
      )}
    </section>
  );
}
