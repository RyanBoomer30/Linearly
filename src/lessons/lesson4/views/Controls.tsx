import type { ReactNode } from 'react';
import { GridEditor } from '../../../components/editor/GridEditor';
import { MathText } from '../../../components/display/MathText';
import { ViewNotice } from '../../../components/display/ViewNotice';
import type { HouseholderSign } from '../../../core/householder';
import { LESSON4_PRESETS } from '../../../presets/lesson4';
import { useLesson4Store } from '../../../store/useLesson4Store';
import { useLesson4System } from '../../../store/useLesson4System';
import { attempt } from '../../../store/useSystem';
import { columnColor } from '../../../theme/colors';

/** L4-QR5: the notes' sign or the stable one. */
export function SignPicker() {
  const sign = useLesson4Store((s) => s.sign);
  const setSign = useLesson4Store((s) => s.setSign);
  const options: [HouseholderSign, string][] = [
    ['notes', '$w = +\\|x\\|e_1$ (notes)'],
    ['stable', '$w = -\\operatorname{sign}(x_1)\\|x\\|e_1$ (stable)'],
  ];
  return (
    <div className="segmented" role="group" aria-label="Householder sign">
      {options.map(([value, label]) => (
        <button key={value} type="button" className={sign === value ? 'active' : undefined} onClick={() => setSign(value)}>
          <MathText>{label}</MathText>
        </button>
      ))}
    </div>
  );
}

/** Sidebar for the A, b views (§8.3–8.7): preset, A (m ≥ n), b, sign, and the explicit imports (§9). */
export function Controls({ children, showB = true, showSign = true }: { children?: ReactNode; showB?: boolean; showSign?: boolean }) {
  const { aCells, bCells, presetId, notice, setACell, setBCell, resize, loadPreset, importFromLesson1, importFromLesson2, dismissNotice } =
    useLesson4Store();
  const system = useLesson4System();
  const invalid = system.ok ? system.value.invalid : { A: [], b: [] };
  const m = aCells.length;
  const n = aCells[0]?.length ?? 0;
  const run = (fn: () => void) => attempt(fn);
  return (
    <>
      <label className="preset-picker">
        Preset{' '}
        <select value={presetId ?? ''} onChange={(e) => loadPreset(e.target.value)}>
          <option value="" disabled>
            Custom
          </option>
          {LESSON4_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="product-editors">
        <GridEditor
          label={`A (${m} × ${n})`}
          cells={aCells}
          onChange={setACell}
          invalid={invalid.A}
          columnHeader={(j) => `a${'₁₂₃₄'[j]}`}
          columnColor={columnColor}
          onAddRow={() => run(() => resize(m + 1, n))}
          onRemoveRow={() => run(() => resize(m - 1, n))}
          onAddColumn={() => run(() => resize(m, n + 1))}
          onRemoveColumn={() => run(() => resize(m, n - 1))}
        />
        {showB && <GridEditor label="b" cells={bCells.map((x) => [x])} onChange={(i, _j, v) => setBCell(i, v)} invalid={invalid.b.map((i) => [i, 0] as [number, number])} />}
      </div>
      <div className="editor-buttons">
        <button type="button" onClick={() => run(importFromLesson1)}>
          Use Lesson 1's A and b
        </button>
        <button type="button" onClick={() => run(importFromLesson2)}>
          Use Lesson 2's X and Y
        </button>
      </div>
      {notice && (
        <div className="view-notice" role="status">
          {notice}
          <button type="button" onClick={dismissNotice} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {showSign && <SignPicker />}
      {!system.ok && <ViewNotice error={system.error} />}
      {children}
    </>
  );
}
