import { useEffect, type ComponentType } from 'react';
import { DEFAULT_PRESET_FOR_VIEW, type ViewId } from '../../presets';
import { useStore } from '../../store/useStore';
import { BigPictureView } from './views/BigPictureView';
import { ColumnPictureView } from './views/ColumnPictureView';
import { ColumnSpaceView } from './views/ColumnSpaceView';
import { EliminationView } from './views/EliminationView';
import { PrimitivesDemoView } from './views/PrimitivesDemoView';
import { ProductsView } from './views/ProductsView';
import { RowPictureView } from './views/RowPictureView';
import { SideBySideView } from './views/SideBySideView';
import { SubspacesView } from './views/SubspacesView';

const VIEWS: { id: ViewId; label: string; component: ComponentType }[] = [
  { id: 'row', label: 'Row picture', component: RowPictureView },
  { id: 'column', label: 'Column picture', component: ColumnPictureView },
  { id: 'sideBySide', label: 'Side by side', component: SideBySideView },
  { id: 'elimination', label: 'Elimination', component: EliminationView },
  { id: 'columnSpace', label: 'Column space', component: ColumnSpaceView },
  { id: 'products', label: 'Products & CR', component: ProductsView },
  { id: 'subspaces', label: 'Four subspaces', component: SubspacesView },
  { id: 'bigPicture', label: 'Big picture', component: BigPictureView },
  { id: 'demo', label: 'Primitives demo', component: PrimitivesDemoView },
];

/** Lesson 1: Matrices — Rows and Columns, Product and Factorization. */
export default function Lesson1() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const loadPreset = useStore((s) => s.loadPreset);

  // Every view opens with its matching preset (§6).
  useEffect(() => loadPreset(DEFAULT_PRESET_FOR_VIEW[view]), [view, loadPreset]);

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
      <Active key={view} />
    </div>
  );
}
