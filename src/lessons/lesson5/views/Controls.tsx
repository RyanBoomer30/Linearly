import type { ReactNode } from 'react';
import { MathText } from '../../../components/display/MathText';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridEditor } from '../../../components/editor/GridEditor';
import { checkStochastic } from '../../../core/markov';
import { LESSON5_PRESETS, lesson5PresetById } from '../../../presets/lesson5';
import { useLesson5Store } from '../../../store/useLesson5Store';
import { useLesson5System } from '../../../store/useLesson5System';
import { attempt } from '../../../store/useSystem';
import { stateColor } from '../../../theme/colors';
import { useLesson5 } from '../useLesson5';
import type { Check } from '../models';

/** "✓ VΛV⁻¹ = P" lines under a result. */
export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="checks">
      {checks.map((c) => (
        <li key={c.name} className={c.holds ? 'hit' : 'solution-msg warn'}>
          {c.holds ? '✓' : '✗'} <Tex tex={c.tex} />
          {c.residual !== undefined && <span className="caption"> (difference {c.residual.toExponential(1)})</span>}
          {c.reason && (
            <div className="caption">
              <MathText>{c.reason}</MathText>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** F-D7: fractions (default in Lesson 5) or decimals. */
export function NumberDisplayPicker() {
  const mode = useLesson5Store((s) => s.numberDisplay);
  const setMode = useLesson5Store((s) => s.setNumberDisplay);
  return (
    <div className="segmented" role="group" aria-label="Number display">
      <button type="button" className={mode === 'fraction' ? 'active' : undefined} onClick={() => setMode('fraction')}>
        Fractions
      </button>
      <button type="button" className={mode === 'decimal' ? 'active' : undefined} onClick={() => setMode('decimal')}>
        Decimals
      </button>
    </div>
  );
}

/** L5-EV1: x₀ as cells, with a button per pure state. */
export function InitialDistribution() {
  const { x0Cells, stateNames, setX0Cell, setPureState } = useLesson5Store();
  const system = useLesson5System();
  const invalid = system.ok ? system.value.invalid.x0 : [];
  return (
    <div className="initial-distribution">
      <GridEditor
        label="x₀"
        cells={x0Cells.map((x) => [x])}
        onChange={(i, _j, v) => setX0Cell(i, v)}
        invalid={invalid.map((i) => [i, 0] as [number, number])}
      />
      <div className="editor-buttons" role="group" aria-label="Pure states">
        {stateNames.map((name, i) => (
          <button key={i} type="button" style={{ color: stateColor(i) }} onClick={() => setPureState(i)}>
            Start on {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Sidebar shared by the chain views (§9.1–9.2, §9.4–9.7): preset, P (rows
 * "to", columns "from", each state in its color), x₀, add/remove states,
 * validation with "normalize this column" (L5-MC4), and the number display.
 */
export function Controls({ children, showX0 = true }: { children?: ReactNode; showX0?: boolean }) {
  const { pCells, presetId, notice, setPCell, addState, removeState, normalizeColumn, loadPreset, dismissNotice } = useLesson5Store();
  const system = useLesson5System();
  const check = useLesson5((s) => checkStochastic(s.P));
  const invalid = system.ok ? system.value.invalid.P : [];
  const n = pCells.length;
  const preset = presetId ? lesson5PresetById(presetId) : null;
  const run = (fn: () => void) => attempt(fn);

  return (
    <>
      <label className="preset-picker">
        Preset{' '}
        <select value={presetId ?? ''} onChange={(e) => loadPreset(e.target.value)}>
          <option value="" disabled>
            Custom
          </option>
          {LESSON5_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {preset?.explanation && <p className="caption counterexample">{preset.explanation}</p>}
      <GridEditor
        label={`P (${n} × ${n}) — columns "from", rows "to"`}
        cells={pCells}
        onChange={setPCell}
        invalid={invalid}
        columnHeader={(j) => `from ${j + 1}`}
        columnColor={stateColor}
        onAddColumn={n < 4 ? () => run(addState) : undefined}
        onRemoveColumn={n > 2 ? () => run(() => removeState(n - 1)) : undefined}
        columnNoun="state"
      />
      {!check.ok && <ViewNotice error={check.error} />}
      {check.ok && !check.value.valid && (
        <ul className="column-checks">
          {check.value.columns.map(
            (c, j) =>
              (!c.sumsToOne || c.outOfRange.length > 0) && (
                <li key={j} className="solution-msg warn">
                  Column {j + 1} {c.outOfRange.length > 0 ? 'has entries outside [0, 1]' : `sums to ${c.sum.toString()}, not 1`}.{' '}
                  <button type="button" className="link-button" onClick={() => run(() => normalizeColumn(j))}>
                    Normalize this column
                  </button>
                </li>
              ),
          )}
        </ul>
      )}
      {showX0 && <InitialDistribution />}
      {notice && (
        <div className="view-notice" role="status">
          {notice}
          <button type="button" onClick={dismissNotice} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <NumberDisplayPicker />
      {!system.ok && <ViewNotice error={system.error} />}
      {children}
    </>
  );
}
