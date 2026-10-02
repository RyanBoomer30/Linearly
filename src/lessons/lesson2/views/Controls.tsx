import { useState, type ReactNode } from 'react';
import { DataTable } from '../../../components/table/DataTable';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { DATASET_PRESETS } from '../../../presets/datasets';
import { useDataset } from '../../../store/useDataset';
import { useDataStore, type NumberDisplay } from '../../../store/useDataStore';
import { ModelPicker } from './ModelPicker';

/** F-P3: dropdown of dataset presets. */
export function DatasetPresetPicker() {
  const presetId = useDataStore((s) => s.presetId);
  const loadPreset = useDataStore((s) => s.loadPreset);
  return (
    <label className="preset-picker">
      Dataset{' '}
      <select value={presetId ?? ''} onChange={(e) => loadPreset(e.target.value)}>
        <option value="" disabled>
          Custom
        </option>
        {DATASET_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** F-D7: decimals (Lesson 2 default) or exact fractions. */
export function NumberDisplayToggle() {
  const mode = useDataStore((s) => s.numberDisplay);
  const setMode = useDataStore((s) => s.setNumberDisplay);
  const options: [NumberDisplay, string][] = [
    ['decimal', 'Decimals'],
    ['fraction', 'Fractions'],
  ];
  return (
    <div className="segmented" role="group" aria-label="Number display">
      {options.map(([value, label]) => (
        <button key={value} type="button" className={mode === value ? 'active' : undefined} onClick={() => setMode(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Shared Lesson 2 sidebar: dataset preset + data table + model picker + view-specific extras. */
export function Controls({ children, showModel = true }: { children?: ReactNode; showModel?: boolean }) {
  const parsed = useDataset();
  const [pasteError, setPasteError] = useState<string | null>(null);
  return (
    <>
      <DatasetPresetPicker />
      <DataTable invalid={parsed.ok ? parsed.value.invalid : []} onPasteError={setPasteError} />
      {pasteError && <ViewNotice error={pasteError} />}
      {!parsed.ok && <ViewNotice error={parsed.error} />}
      {showModel && <ModelPicker />}
      <NumberDisplayToggle />
      {children}
    </>
  );
}
