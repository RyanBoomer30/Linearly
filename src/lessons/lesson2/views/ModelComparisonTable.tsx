import { Num } from '../../../components/display/Num';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { useDataset } from '../../../store/useDataset';
import { useDataStore } from '../../../store/useDataStore';
import { attempt } from '../../../store/useSystem';
import { comparisonChoices, modelComparison } from '../models';

/** L2-L6: model, number of parameters, θ*, mean RSS. Shared by the loss and multi-variable views. */
export function ModelComparisonTable() {
  const parsed = useDataset();
  const model = useDataStore((s) => s.model);
  const rows = parsed.ok
    ? attempt(() => modelComparison(parsed.value.dataset, comparisonChoices(parsed.value.dataset), model))
    : parsed;

  return (
    <section>
      <h3>Compare models</h3>
      {rows.ok ? (
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Parameters</th>
              <th>θ*</th>
              <th>Mean RSS</th>
            </tr>
          </thead>
          <tbody>
            {rows.value.map((r) => (
              <tr key={r.name} className={r.current ? 'selected' : undefined}>
                <td>{r.name}</td>
                <td>{r.parameters}</td>
                <td>
                  <Tex tex={r.thetaTex} />
                </td>
                <td>{r.meanRss ? <Num value={r.meanRss} /> : 'singular'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ViewNotice error={rows.error} />
      )}
    </section>
  );
}
