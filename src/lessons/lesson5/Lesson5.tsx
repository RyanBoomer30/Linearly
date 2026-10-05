import type { ComponentType } from 'react';
import { useLesson5Store, type Lesson5ViewId } from '../../store/useLesson5Store';
import { ChainView } from './views/ChainView';
import { ComponentsView } from './views/ComponentsView';
import { EigenView } from './views/EigenView';
import { EstimateView } from './views/EstimateView';
import { EvolutionView } from './views/EvolutionView';
import { PerronView } from './views/PerronView';
import { PowerLayersView } from './views/PowerLayersView';

const VIEWS: { id: Lesson5ViewId; label: string; component: ComponentType }[] = [
  { id: 'chain', label: 'Chain & transition matrix', component: ChainView },
  { id: 'evolution', label: 'Evolution', component: EvolutionView },
  { id: 'estimate', label: 'Estimate P from data', component: EstimateView },
  { id: 'eigen', label: 'Eigendecomposition', component: EigenView },
  { id: 'components', label: 'Components over time', component: ComponentsView },
  { id: 'layers', label: 'Pᵗ as rank-1 layers', component: PowerLayersView },
  { id: 'perron', label: 'Perron–Frobenius & stationary distribution', component: PerronView },
];

/** Lesson 5: Eigendecomposition and Markov chains. One chain (P and x₀) is shared across the views (§10). */
export default function Lesson5() {
  const view = useLesson5Store((s) => s.view);
  const setView = useLesson5Store((s) => s.setView);

  const Active = VIEWS.find((v) => v.id === view)!.component;
  return (
    <div className="lesson">
      <p className="lesson-intro">
        So far the course has been about Ax = b. Lesson 5 turns to the other central equation, Av = λv. A Markov chain moves
        a probability distribution with x(t + 1) = Px(t); the eigenvectors of P split x(t) into pieces that each evolve on
        their own, and the piece with λ = 1 is where the chain settles.
      </p>
      <div className="view-tabs" role="tablist" aria-label="Lesson 5 views">
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
