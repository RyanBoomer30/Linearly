import type { ComponentType } from 'react';
import { useLesson7Store, type Lesson7ViewId } from '../../store/useLesson7Store';
import { BestLineView } from './views/BestLineView';
import { CompressionView } from './views/CompressionView';
import { CovarianceView } from './views/CovarianceView';
import { FacesView } from './views/FacesView';
import { PcaView } from './views/PcaView';
import { ReductionView } from './views/ReductionView';
import { SvdView } from './views/SvdView';
import { VarianceView } from './views/VarianceView';

const VIEWS: { id: Lesson7ViewId; label: string; component: ComponentType }[] = [
  { id: 'svd', label: 'SVD & best rank-k', component: SvdView },
  { id: 'image', label: 'Image compression', component: CompressionView },
  { id: 'pca', label: 'PCA: centering & components', component: PcaView },
  { id: 'reduction', label: 'Dimension reduction', component: ReductionView },
  { id: 'covariance', label: 'Covariance matrix', component: CovarianceView },
  { id: 'variance', label: 'Variance explained & standardizing', component: VarianceView },
  { id: 'bestLine', label: 'Best line: regression vs PCA', component: BestLineView },
  { id: 'faces', label: 'Face recognition', component: FacesView },
];

/** Lesson 7: SVD, compression, PCA and dimension reduction — the end of the rank-1 story that began in Lesson 3. */
export default function Lesson7() {
  const view = useLesson7Store((s) => s.view);
  const setView = useLesson7Store((s) => s.setView);

  const Active = VIEWS.find((v) => v.id === view)!.component;
  return (
    <div className="lesson">
      <p className="lesson-intro">
        Every matrix is a sum of rank-1 pieces σᵢuᵢvᵢᵀ in decreasing order of size. Keeping the first k gives the best
        rank-k approximation: a compressed image, or — for a centered data matrix — principal component analysis, which
        replaces many correlated variables by a few new ones.
      </p>
      <div className="view-tabs" role="tablist" aria-label="Lesson 7 views">
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
