import { PRESETS } from '../../presets';
import { useStore } from '../../store/useStore';

/** F-P1: dropdown of named presets from the notes. */
export function PresetPicker() {
  const presetId = useStore((s) => s.presetId);
  const loadPreset = useStore((s) => s.loadPreset);
  return (
    <label className="preset-picker">
      Preset{' '}
      <select value={presetId ?? ''} onChange={(e) => loadPreset(e.target.value)}>
        <option value="" disabled>
          Custom
        </option>
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
