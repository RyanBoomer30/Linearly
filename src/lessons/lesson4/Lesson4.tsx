import type { ComponentType } from 'react';
import { useLesson4Store, type Lesson4ViewId } from '../../store/useLesson4Store';
import { ConditioningView } from './views/ConditioningView';
import { GramSchmidtView } from './views/GramSchmidtView';
import { LeastSquaresQrView } from './views/LeastSquaresQrView';
import { PropertiesView } from './views/PropertiesView';
import { QrView } from './views/QrView';
import { ReducedQrView } from './views/ReducedQrView';
import { ReflectorView } from './views/ReflectorView';

const VIEWS: { id: Lesson4ViewId; label: string; component: ComponentType }[] = [
  { id: 'reflector', label: 'Householder reflector', component: ReflectorView },
  { id: 'properties', label: 'Reflector properties', component: PropertiesView },
  { id: 'qr', label: 'Householder QR', component: QrView },
  { id: 'reducedQr', label: 'Reduced QR', component: ReducedQrView },
  { id: 'leastSquares', label: 'Least squares via QR', component: LeastSquaresQrView },
  { id: 'conditioning', label: 'Conditioning', component: ConditioningView },
  { id: 'gramSchmidt', label: 'Gram–Schmidt vs Householder', component: GramSchmidtView },
];

/** Lesson 4: Householder QR. The SVD mode of the big picture (§8.8) lives in Lesson 1. */
export default function Lesson4() {
  const view = useLesson4Store((s) => s.view);
  const setView = useLesson4Store((s) => s.setView);

  const Active = VIEWS.find((v) => v.id === view)!.component;
  return (
    <div className="lesson">
      {/* §8: the notes' motivation, linking to the conditioning view. */}
      <p className="lesson-intro">
        The normal equation AᵀAx = Aᵀb is the textbook way to solve least squares, but on a computer it can be unstable:
        forming AᵀA squares the condition number, so it can lose twice as many digits.{' '}
        <button type="button" className="link-button" onClick={() => setView('conditioning')}>
          See why
        </button>
        . Householder QR solves the same problem without forming AᵀA.
      </p>
      <div className="view-tabs" role="tablist" aria-label="Lesson 4 views">
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
