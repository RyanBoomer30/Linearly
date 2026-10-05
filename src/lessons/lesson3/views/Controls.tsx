import type { ReactNode } from 'react';
import { GridEditor } from '../../../components/editor/GridEditor';
import { ViewNotice } from '../../../components/display/ViewNotice';
import type { Pivoting } from '../../../core/lu';
import { LESSON3_PRESETS, PRODUCT_PRESETS } from '../../../presets/lesson3';
import { useLesson3Store } from '../../../store/useLesson3Store';
import { useLesson3System } from '../../../store/useLesson3System';
import { attempt } from '../../../store/useSystem';
import { columnColor } from '../../../theme/colors';

const PIVOTING: [Pivoting, string][] = [
  ['none', 'No row exchanges'],
  ['zero-only', 'Only at a zero pivot'],
  ['partial', 'Partial pivoting (largest |entry|)'],
];

/** L3-PM4: pivoting setting shared by the LU, solve, LDU and PA = LU views. */
export function PivotingPicker() {
  const pivoting = useLesson3Store((s) => s.pivoting);
  const setPivoting = useLesson3Store((s) => s.setPivoting);
  return (
    <label className="preset-picker">
      Pivoting{' '}
      <select value={pivoting} onChange={(e) => setPivoting(e.target.value as Pivoting)}>
        {PIVOTING.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Sidebar for the square-matrix views: preset, A, right-hand sides, pivoting, and the Lesson 1 import (§8). */
export function Controls({
  children,
  showRhs = true,
  showPivoting = true,
  showA = true,
  factors,
  top,
}: {
  children?: ReactNode;
  showRhs?: boolean;
  showPivoting?: boolean;
  /** Hide A's editor (L3-S6: solving from L and U). */
  showA?: boolean;
  /** Shown in A's place, e.g. the L and U editors. */
  factors?: ReactNode;
  /** Shown right under the preset picker, e.g. a switch that changes the editors below. */
  top?: ReactNode;
}) {
  const { aCells, rhsCells, presetId, notice, setACell, setRhsCell, setSize, addRhs, removeRhs, loadPreset, importFromLesson1, dismissNotice } =
    useLesson3Store();
  const system = useLesson3System();
  const invalid = system.ok ? system.value.invalid : { A: [], rhs: [] };
  const n = aCells.length;
  // Right-hand sides are edited as columns b₁ … bₖ.
  const rhsColumns = Array.from({ length: n }, (_, i) => rhsCells.map((b) => b[i]));
  const run = (fn: () => void) => attempt(fn);

  return (
    <>
      <label className="preset-picker">
        Preset{' '}
        <select value={presetId ?? ''} onChange={(e) => loadPreset(e.target.value)}>
          <option value="" disabled>
            Custom
          </option>
          {LESSON3_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {top}
      {showA ? (
        <>
        <GridEditor
          label="A"
          cells={aCells}
          onChange={setACell}
          invalid={invalid.A}
          columnHeader={(j) => `a${'₁₂₃₄'[j]}`}
          columnColor={columnColor}
        />
        <div className="editor-buttons">
          <button type="button" onClick={() => run(() => setSize(n + 1))} disabled={n >= 4}>
            + size
          </button>
          <button type="button" onClick={() => run(() => setSize(n - 1))} disabled={n <= 1}>
            − size
          </button>
          <button type="button" onClick={() => run(importFromLesson1)}>
            Use Lesson 1's matrix
          </button>
        </div>
        </>
      ) : (
        factors
      )}
      {notice && (
        <div className="view-notice" role="status">
          {notice}
          <button type="button" onClick={dismissNotice} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {showRhs && (
        <GridEditor
          label="Right-hand sides"
          cells={rhsColumns}
          onChange={(i, k, v) => setRhsCell(k, i, v)}
          invalid={invalid.rhs.map(([k, i]) => [i, k] as [number, number])}
          columnHeader={(k) => `b${'₁₂₃₄₅₆₇₈₉'[k] ?? k + 1}`}
          onAddColumn={() => run(addRhs)}
          onRemoveColumn={() => run(() => removeRhs(rhsCells.length - 1))}
          maxSize={9}
          columnNoun="b"
        />
      )}
      {showPivoting && <PivotingPicker />}
      {!system.ok && <ViewNotice error={system.error} />}
      {children}
    </>
  );
}

/** Sidebar for the product views (§7.1–7.2): B and C with their own presets and sizes (L3-MM1, L3-MM6). */
export function ProductControls({ children }: { children?: ReactNode }) {
  const { bCells, cCells, productPresetId, setBCell, setCCell, resizeProduct, loadProductPreset } = useLesson3Store();
  const system = useLesson3System();
  const invalid = system.ok ? system.value.invalid : { B: [], C: [] };
  const size = (grid: string[][]) => [grid.length, grid[0]?.length ?? 0] as const;
  const resize = (which: 'B' | 'C', dr: number, dc: number) => {
    const [r, c] = size(which === 'B' ? bCells : cCells);
    attempt(() => resizeProduct(which, r + dr, c + dc));
  };
  return (
    <>
      <label className="preset-picker">
        Product{' '}
        <select value={productPresetId ?? ''} onChange={(e) => loadProductPreset(e.target.value)}>
          <option value="" disabled>
            Custom
          </option>
          {PRODUCT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="product-editors">
        <GridEditor
          label={`B (${size(bCells).join(' × ')})`}
          cells={bCells}
          onChange={setBCell}
          invalid={invalid.B}
          columnColor={columnColor}
          onAddRow={() => resize('B', 1, 0)}
          onRemoveRow={() => resize('B', -1, 0)}
          onAddColumn={() => resize('B', 0, 1)}
          onRemoveColumn={() => resize('B', 0, -1)}
        />
        <GridEditor
          label={`C (${size(cCells).join(' × ')})`}
          cells={cCells}
          onChange={setCCell}
          invalid={invalid.C}
          onAddRow={() => resize('C', 1, 0)}
          onRemoveRow={() => resize('C', -1, 0)}
          onAddColumn={() => resize('C', 0, 1)}
          onRemoveColumn={() => resize('C', 0, -1)}
        />
      </div>
      {!system.ok && <ViewNotice error={system.error} />}
      {children}
    </>
  );
}

/** L3-S6 / L3-R4: L and U entered directly, shared by the solve and layers views. */
export function FactorEditors() {
  const { lCells, uCells, setLCell, setUCell, fillFactorsFromA } = useLesson3Store();
  const system = useLesson3System();
  const invalid = system.ok ? system.value.invalid : { L: [], U: [] };
  return (
    <>
      <div className="product-editors">
        <GridEditor label="L (lower triangular)" cells={lCells} onChange={setLCell} invalid={invalid.L} />
        <GridEditor label="U (upper triangular)" cells={uCells} onChange={setUCell} invalid={invalid.U} />
      </div>
      <button type="button" onClick={fillFactorsFromA}>
        Fill L and U by factoring A
      </button>
    </>
  );
}
