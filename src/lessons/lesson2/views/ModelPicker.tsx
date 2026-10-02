import { Tex } from '../../../components/display/Tex';
import { modelFormulaTex, modelSpecFor, type ModelChoice } from '../../../core/regression';
import { useDataStore } from '../../../store/useDataStore';
import { attempt } from '../../../store/useSystem';

const CHOICES: { kind: ModelChoice['kind']; label: string }[] = [
  { kind: 'origin', label: 'Through the origin' },
  { kind: 'line', label: 'Line' },
  { kind: 'polynomial', label: 'Polynomial' },
  { kind: 'linear', label: 'Several features' },
];

const choiceFor = (kind: ModelChoice['kind'], current: ModelChoice): ModelChoice => {
  if (kind === 'polynomial') return { kind, degree: current.kind === 'polynomial' ? current.degree : 2 };
  if (kind === 'custom') return { kind, terms: current.kind === 'custom' ? current.terms : [] };
  return { kind };
};

/** L2-D3: model picker, with the chosen formula in KaTeX. */
export function ModelPicker() {
  const model = useDataStore((s) => s.model);
  const setModel = useDataStore((s) => s.setModel);
  const featureCount = useDataStore((s) => s.columns.length - 1);
  const formula = attempt(() => modelFormulaTex(modelSpecFor(model, featureCount), featureCount));

  return (
    <div className="model-picker">
      <div className="segmented" role="group" aria-label="Model">
        {CHOICES.map((c) => (
          <button
            key={c.kind}
            type="button"
            className={model.kind === c.kind ? 'active' : undefined}
            onClick={() => setModel(choiceFor(c.kind, model))}
          >
            {c.label}
          </button>
        ))}
        {model.kind === 'custom' && (
          <button type="button" className="active">
            Custom terms
          </button>
        )}
      </div>
      {model.kind === 'polynomial' && (
        <label className="inline-field">
          Degree d{' '}
          <input
            type="number"
            min={0}
            max={5}
            value={model.degree}
            onChange={(e) => setModel({ kind: 'polynomial', degree: Number(e.target.value) })}
          />
        </label>
      )}
      {formula.ok ? <Tex tex={formula.value} display /> : <p className="caption">{formula.error}</p>}
    </div>
  );
}
