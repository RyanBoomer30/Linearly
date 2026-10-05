import type { ReactNode } from 'react';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { GridEditor } from '../../../components/editor/GridEditor';
import type { ComponentSign } from '../../../core/pca';
import { PCA_COLUMNS } from '../../../presets/lesson7';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { useLesson7System } from '../../../store/useLesson7System';
import { attempt } from '../../../store/useSystem';
import { columnColor } from '../../../theme/colors';

/** F-D7: fractions (default) or decimals. */
export function NumberDisplayPicker() {
  const mode = useLesson7Store((s) => s.numberDisplay);
  const setMode = useLesson7Store((s) => s.setNumberDisplay);
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

/** L7-P5, F-M52: the sign setting, and flipping v₁. */
export function SignControls() {
  const { sign, setSign, flipV1, setFlipV1 } = useLesson7Store();
  const options: [ComponentSign, string][] = [
    ['largest-positive', 'Largest entry positive (notes)'],
    ['as-computed', 'As computed'],
  ];
  return (
    <>
      <div className="segmented" role="group" aria-label="Component signs">
        {options.map(([value, label]) => (
          <button key={value} type="button" className={sign === value ? 'active' : undefined} onClick={() => setSign(value)}>
            {label}
          </button>
        ))}
      </div>
      <label>
        <input type="checkbox" checked={flipV1} onChange={(e) => setFlipV1(e.target.checked)} /> Flip v₁ (as a calculator might)
      </label>
    </>
  );
}

/**
 * Sidebar shared by the PCA views (§11.3–11.7): the notes' data table (age,
 * height, and illustrative weight), the "shift the data" demo, standardizing,
 * and the number display.
 */
export function PcaControls({ children, showStandardize = true }: { children?: ReactNode; showStandardize?: boolean }) {
  const { pcaCells, setPcaCell, addPcaRow, removePcaRow, resetPcaData, shift, setShift, standardize, setStandardize, notice, dismissNotice } =
    useLesson7Store();
  const system = useLesson7System();
  const invalid = system.ok ? system.value.invalid.table : [];
  return (
    <>
      <GridEditor
        label="Data (one row per person)"
        cells={pcaCells}
        onChange={setPcaCell}
        invalid={invalid}
        columnHeader={(j) => PCA_COLUMNS[j]}
        columnColor={columnColor}
        onAddRow={() => attempt(addPcaRow)}
        onRemoveRow={() => attempt(() => removePcaRow(pcaCells.length - 1))}
        maxSize={100}
      />
      <p className="caption">Ages and heights are the notes&apos; (already centered); the weights are illustrative, not from the notes.</p>
      <div className="editor-buttons">
        <button type="button" onClick={resetPcaData}>
          Reset to the notes&apos; data
        </button>
      </div>
      <label className="sliders">
        <span>Shift the data by {shift} (to see why centering matters)</span>
        <input type="range" min={0} max={50} step={5} value={shift} onChange={(e) => setShift(Number(e.target.value))} />
      </label>
      {showStandardize && (
        <label>
          <input type="checkbox" checked={standardize} onChange={(e) => setStandardize(e.target.checked)} /> Standardize each column: (x − x̄)/s
        </label>
      )}
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
