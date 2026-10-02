import type { ComponentType } from 'react';
import { useDataStore, type Lesson2ViewId } from '../../store/useDataStore';
import { DataModelView } from './views/DataModelView';
import { InconsistentSystemView } from './views/InconsistentSystemView';
import { LossExplorerView } from './views/LossExplorerView';
import { MultiVariableView } from './views/MultiVariableView';

const VIEWS: { id: Lesson2ViewId; label: string; component: ComponentType }[] = [
  { id: 'data', label: 'Data & model', component: DataModelView },
  { id: 'inconsistent', label: 'Inconsistent system', component: InconsistentSystemView },
  { id: 'loss', label: 'Loss explorer', component: LossExplorerView },
  { id: 'multi', label: 'Multi-variable & polynomial', component: MultiVariableView },
];

/**
 * Lesson 2: Data, Regression, and Machine Learning. The matrix side of
 * least squares (projection onto C(A), the normal equation) lives in Lesson 1;
 * these views link there with X and Y as A and b.
 */
export default function Lesson2() {
  const view = useDataStore((s) => s.view);
  const setView = useDataStore((s) => s.setView);

  const Active = VIEWS.find((v) => v.id === view)!.component;
  return (
    <div className="lesson">
      <div className="view-tabs" role="tablist" aria-label="Lesson 2 views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === view}
            className={v.id === view ? 'view-tab active' : 'view-tab'}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <Active key={view} />
    </div>
  );
}
