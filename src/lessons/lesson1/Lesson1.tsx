import type { ComponentType } from 'react';
import type { ViewId } from '../../presets';
import { useStore } from '../../store/useStore';
import { BigPictureView } from './views/BigPictureView';
import { ColumnPictureView } from './views/ColumnPictureView';
import { EliminationView } from './views/EliminationView';
import { ProductsView } from './views/ProductsView';
import { RowPictureView } from './views/RowPictureView';
import { ColumnVsRowView } from './views/ColumnVsRowView';
import { SubspacesView } from './views/SubspacesView';

const VIEWS: { id: ViewId; label: string; component: ComponentType }[] = [
  { id: 'row', label: 'Row picture', component: RowPictureView },
  { id: 'column', label: 'Column picture & C(A)', component: ColumnPictureView },
  { id: 'columnVsRow', label: 'Column vs row', component: ColumnVsRowView },
  { id: 'elimination', label: 'Elimination', component: EliminationView },
  { id: 'products', label: 'Products & CR', component: ProductsView },
  { id: 'subspaces', label: 'Four subspaces', component: SubspacesView },
  { id: 'bigPicture', label: 'Big picture', component: BigPictureView },
];

/** Lesson 1: Matrices — Rows and Columns, Product and Factorization. */
export default function Lesson1() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const notice = useStore((s) => s.notice);
  const dismissNotice = useStore((s) => s.dismissNotice);

  const Active = VIEWS.find((v) => v.id === view)!.component;
  return (
    <div className="lesson">
      <div className="view-tabs" role="tablist" aria-label="Lesson 1 views">
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
      {notice && (
        <div className="view-notice" role="status">
          {notice}
          <button type="button" onClick={dismissNotice} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <Active key={view} />
    </div>
  );
}
