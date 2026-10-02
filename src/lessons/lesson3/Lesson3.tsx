import type { ComponentType } from 'react';
import { useLesson3Store, type Lesson3ViewId } from '../../store/useLesson3Store';
import { LduView } from './views/LduView';
import { LuView } from './views/LuView';
import { ManyRhsView } from './views/ManyRhsView';
import { PermutationsView } from './views/PermutationsView';
import { RankOneLayersView } from './views/RankOneLayersView';
import { SolveView } from './views/SolveView';
import { TwoWaysView } from './views/TwoWaysView';

const VIEWS: { id: Lesson3ViewId; label: string; component: ComponentType }[] = [
  { id: 'twoWays', label: 'Two ways to multiply', component: TwoWaysView },
  { id: 'layers', label: 'Rank-1 layers', component: RankOneLayersView },
  { id: 'lu', label: 'LU decomposition', component: LuView },
  { id: 'solve', label: 'Solving with LU', component: SolveView },
  { id: 'manyRhs', label: 'Many right-hand sides', component: ManyRhsView },
  { id: 'ldu', label: 'LDU', component: LduView },
  { id: 'permutations', label: 'Row exchanges: PA = LU', component: PermutationsView },
];

/** Lesson 3: Rank-1 Matrices; LU Decomposition. */
export default function Lesson3() {
  const view = useLesson3Store((s) => s.view);
  const setView = useLesson3Store((s) => s.setView);

  const Active = VIEWS.find((v) => v.id === view)!.component;
  return (
    <div className="lesson">
      <div className="view-tabs" role="tablist" aria-label="Lesson 3 views">
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
