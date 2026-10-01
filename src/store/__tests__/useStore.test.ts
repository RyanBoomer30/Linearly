import { beforeEach, describe, expect, it } from 'vitest';
import { PRESETS } from '../../presets';
import { useStore } from '../useStore';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('the matrix persists across views', () => {
  it('an edited matrix survives switching to every view that can draw it', () => {
    s().loadPreset('consistent3x3');
    s().setCell(0, 0, '7');
    s().setBCell(2, '9');
    for (const view of ['column', 'columnVsRow', 'elimination', 'products', 'subspaces', 'bigPicture', 'row'] as const) {
      s().setView(view);
      expect(s().aCells[0][0]).toBe('7');
      expect(s().bCells![2]).toBe('9');
      expect(s().notice).toBeNull();
    }
  });

  it('switching back and forth keeps the preset choice', () => {
    s().loadPreset('inconsistent3x3');
    s().setView('elimination');
    s().setView('row');
    expect(s().presetId).toBe('inconsistent3x3');
  });

  it("b is kept when visiting views that don't show it", () => {
    s().loadPreset('consistent3x3');
    s().setBCell(0, '1/2');
    s().setView('products');
    s().setView('row');
    expect(s().bCells).toEqual(['1/2', '5', '4']);
  });
});

describe('a view that cannot draw the current size loads its default preset', () => {
  it('3×4 in the row picture (4 unknowns) → 2×2 preset with a notice', () => {
    s().setView('bigPicture');
    s().loadPreset('strang3x4');
    s().setView('row');
    expect(s().view).toBe('row');
    expect(s().presetId).toBe('system2x2');
    expect(s().notice).toMatch(/2 or 3 unknowns.*3×4/);
  });

  it('4 rows in the column picture → its default preset', () => {
    s().setView('elimination');
    s().addRow(); // 2×2 → 3×2
    s().addRow(); // → 4×2
    expect(s().aCells).toHaveLength(4);
    s().setView('column');
    expect(s().aCells).toHaveLength(2);
    expect(s().notice).toMatch(/2 or 3 equations/);
  });

  it('views with no size limit never replace the matrix', () => {
    s().loadPreset('strang3x4');
    for (const view of ['elimination', 'products', 'subspaces', 'bigPicture'] as const) {
      s().setView(view);
      expect(s().presetId).toBe('strang3x4');
    }
  });

  it('the notice clears on dismiss, a preset load, or the next switch', () => {
    const triggerNotice = () => {
      s().setView('elimination');
      s().loadPreset('strang3x4');
      s().setView('row');
      expect(s().notice).not.toBeNull();
    };
    triggerNotice();
    s().dismissNotice();
    expect(s().notice).toBeNull();
    triggerNotice();
    s().loadPreset('consistent3x3');
    expect(s().notice).toBeNull();
    triggerNotice();
    s().setView('elimination');
    expect(s().notice).toBeNull();
  });

  it('re-selecting the current view does nothing', () => {
    s().loadPreset('strang3x4');
    s().setView('row');
    expect(s().presetId).toBe('strang3x4');
  });
});

describe('editor resizing (F-E3)', () => {
  it('rows and columns stay within 1–4, and b grows with the rows', () => {
    for (let k = 0; k < 6; k++) s().addColumn();
    expect(s().aCells[0]).toHaveLength(4);
    for (let k = 0; k < 6; k++) s().addRow();
    expect(s().aCells).toHaveLength(4);
    expect(s().bCells).toHaveLength(4);
    for (let k = 0; k < 6; k++) s().removeRow();
    expect(s().aCells).toHaveLength(1);
    expect(s().bCells).toHaveLength(1);
  });
});

it('every preset has a b with one entry per row', () => {
  for (const p of PRESETS) expect(p.b).toHaveLength(p.A.length);
});
