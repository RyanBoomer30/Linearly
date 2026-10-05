import { useMemo } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Axes2D, chartFit, FunctionPlot, Scatter, SlopeLine } from '../../../components/canvas/charts';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { parseSequence } from '../../../core/markov';
import { matrix } from '../../../core/matrix';
import { SEQUENCE_LENGTH_RANGE } from '../../../presets/lesson5';
import { useLesson5Store } from '../../../store/useLesson5Store';
import { attempt } from '../../../store/useSystem';
import { stateColor } from '../../../theme/colors';
import { countingTrace, estimateView, estimationErrorView, practiceCheck, type PracticeCell } from '../models';
import { useLesson5 } from '../useLesson5';
import { NumberDisplayPicker } from './Controls';

const PRACTICE_MARK: Record<PracticeCell, string> = { correct: '✓', wrong: '✗', invalid: '?', empty: '' };

/** L5-ES2: the sequence with the pair being counted outlined. */
function SequenceStrip({ states, index }: { states: number[]; index: number }) {
  // Long simulated sequences: show a window around the current pair.
  const start = Math.max(0, Math.min(index - 20, states.length - 60));
  const shown = states.slice(start, start + 60);
  return (
    <div className="sequence-strip" aria-label="Sequence">
      {start > 0 && <span className="caption">… </span>}
      {shown.map((st, k) => {
        const at = start + k;
        const active = index >= 0 && (at === index || at === index + 1);
        return (
          <span key={at} className={active ? 'sequence-state active' : 'sequence-state'} style={{ color: stateColor(st) }}>
            {st + 1}
          </span>
        );
      })}
      {start + 60 < states.length && <span className="caption"> …</span>}
    </div>
  );
}

/** §9.3 */
export function EstimateView() {
  const {
    pCells,
    sequenceText,
    sequenceSource,
    sequenceLength,
    seed,
    numberDisplay,
    practiceCells,
    practiceRevealed,
    setSequenceText,
    setSequenceLength,
    simulateSequence,
    newSeed,
    setPracticeCell,
    revealPractice,
    useEstimate,
  } = useLesson5Store();
  const n = pCells.length;
  const parsed = useMemo(() => attempt(() => parseSequence(sequenceText, n)), [sequenceText, n]);
  const states = parsed.ok ? parsed.value.states : [];
  const trace = useMemo(() => attempt(() => countingTrace(states, n)), [states, n]);
  const view = useMemo(() => attempt(() => estimateView(states, n, numberDisplay)), [states, n, numberDisplay]);
  const practice = useMemo(
    () => (view.ok ? attempt(() => practiceCheck(practiceCells, view.value.estimate)) : null),
    [view, practiceCells],
  );
  const error = useLesson5(
    (s) => (sequenceSource === 'simulated' && view.ok ? estimationErrorView(s.P, view.value.estimate, states[0] ?? 0, seed) : null),
    [sequenceSource, view, seed, states],
  );
  const steps = trace.ok ? trace.value : [];
  const stepper = useStepper(steps.length, sequenceText);
  const step = steps[stepper.index];
  const showAnswer = practiceRevealed || (practice?.ok && practice.value.allCorrect);

  const sendEstimate = () =>
    view.ok &&
    attempt(() => {
      const cells = view.value.estimate.estimate.map((r) => r.map((x) => x?.toString() ?? 'x'));
      useEstimate(matrix(cells));
    });

  return (
    <ModuleLayout
      controls={
        <>
          <Caption section="§5.2">
            In real problems P is not given; we estimate it from a long sequence of observed states.
          </Caption>
          <label className="sequence-input">
            Sequence of states (1 … {n})
            <textarea value={sequenceText} onChange={(e) => setSequenceText(e.target.value)} rows={4} spellCheck={false} />
          </label>
          {parsed.ok && parsed.value.invalid.length > 0 && (
            <p className="solution-msg warn">Not states 1 … {n}: {[...new Set(parsed.value.invalid)].join(', ')}</p>
          )}
          {!parsed.ok && <ViewNotice error={parsed.error} />}
          <fieldset>
            <legend>Or simulate the current chain</legend>
            <label className="sliders">
              <span>Length {sequenceLength}</span>
              <input
                type="range"
                min={SEQUENCE_LENGTH_RANGE[0]}
                max={SEQUENCE_LENGTH_RANGE[1]}
                step={10}
                value={sequenceLength}
                onChange={(e) => setSequenceLength(Number(e.target.value))}
              />
            </label>
            <div className="editor-buttons">
              <button type="button" onClick={() => attempt(simulateSequence)}>
                Simulate
              </button>
              <button type="button" onClick={() => attempt(newSeed)}>
                New seed
              </button>
            </div>
            <p className="caption">Seed {seed}</p>
          </fieldset>
          <NumberDisplayPicker />
        </>
      }
    >
      <section>
        <h3>Count the transitions</h3>
        {!trace.ok && <ViewNotice error={trace.error} />}
        {trace.ok && step && (
          <>
            <SequenceStrip states={states} index={step.index} />
            <StepperControls stepper={stepper} description={step.description} tex={step.tex} />
            <MatrixTex
              entries={step.counts.map((r) => r.map(String))}
              highlights={{
                columnColors: step.counts[0]?.map((_, j) => stateColor(j)),
                entryBackgrounds: step.from !== null && step.to !== null ? { [`${step.to},${step.from}`]: '#F0E442' } : undefined,
              }}
            />
            <p className="caption">Count table N(i → j): column i is &quot;from&quot;, row j is &quot;to&quot;, laid out like P.</p>
          </>
        )}
      </section>
      <section>
        <h3>The estimate</h3>
        {!view.ok && <ViewNotice error={view.error} />}
        {view.ok && (
          <>
            <Tex tex={view.value.formulaTex} display />
            <p className="caption">{view.value.mleNote}</p>
            {view.value.example && <p>{view.value.example}</p>}
            {view.value.undefinedMessages.map((m) => (
              <p key={m} className="solution-msg warn">
                {m}
              </p>
            ))}
            {showAnswer ? (
              <>
                <MatrixTex entries={view.value.entries} highlights={{ columnColors: view.value.entries[0]?.map((_, j) => stateColor(j)) }} />
                <button type="button" onClick={sendEstimate} disabled={view.value.estimate.undefinedColumns.length > 0}>
                  Use this estimate
                </button>
              </>
            ) : (
              <div className="practice">
                <p>
                  The notes leave this matrix as homework. Enter your P̂, then check it entry by entry.
                </p>
                <table className="practice-grid">
                  <tbody>
                    {practiceCells.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => {
                          const status = practice?.ok ? practice.value.cells[i]?.[j] : undefined;
                          return (
                            <td key={j} className={status ? `practice-${status}` : undefined}>
                              <input
                                value={cell}
                                onChange={(e) => setPracticeCell(i, j, e.target.value)}
                                aria-label={`p̂ row ${i + 1}, column ${j + 1}`}
                                size={5}
                              />
                              <span className="practice-mark">{status ? PRACTICE_MARK[status] : ''}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {practice && !practice.ok && <ViewNotice error={practice.error} />}
                {practice?.ok && (
                  <p>
                    {practice.value.correct} of {practice.value.total} entries correct.
                  </p>
                )}
                <button type="button" onClick={revealPractice}>
                  Reveal the answer
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {sequenceSource === 'simulated' && (
        <section>
          <h3>Estimate against the true P</h3>
          {!error.ok && <ViewNotice error={error.error} />}
          {error.ok && error.value && (
            <>
              <p>Largest entry error: {error.value.maxError.toExponential(2)}</p>
              <Canvas2D bare fit={chartFit(error.value.frame)}>
                <Axes2D frame={error.value.frame}>
                  <SlopeLine slope={error.value.reference.slope} through={error.value.reference.through} color="#71717a" label={error.value.reference.label} />
                  <FunctionPlot points={error.value.points} color={stateColor(0)} lineWidth={2} />
                  <Scatter points={error.value.points.map((p) => ({ at: p, color: stateColor(0) }))} />
                </Axes2D>
              </Canvas2D>
            </>
          )}
        </section>
      )}
    </ModuleLayout>
  );
}
