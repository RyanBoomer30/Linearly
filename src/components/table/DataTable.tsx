import type { ClipboardEvent } from 'react';
import { attempt } from '../../store/useSystem';
import { MAX_DATA_ROWS, MAX_FEATURES, useDataStore } from '../../store/useDataStore';
import { dataRowColor } from '../../theme/colors';
import { onCellKeyDown } from '../editor/MatrixEditor';
import { parseDelimited } from './csv';

interface DataTableProps {
  /** Cells to highlight as invalid ([row, col]) (F-T3). */
  invalid?: [number, number][];
  /** Called with a message when a paste can't be read. */
  onPasteError?: (message: string) => void;
}

/**
 * F-T1–F-T5: one row per data point, named columns with units, a target
 * column, per-row colors, paste from a spreadsheet, and keyboard navigation.
 */
export function DataTable({ invalid = [], onPasteError }: DataTableProps) {
  const {
    columns,
    targetCol,
    cells,
    rowLabels,
    selectedRow,
    setCell,
    setColumnInfo,
    setTargetCol,
    addRow,
    removeRow,
    addColumn,
    removeColumn,
    pasteTable,
    selectRow,
  } = useDataStore();
  const isInvalid = (i: number, j: number) => invalid.some(([r, c]) => r === i && c === j);
  const featureCount = columns.length - 1;
  const lastFeature = targetCol === columns.length - 1 ? columns.length - 2 : columns.length - 1;

  // F-T3: a multi-cell paste replaces the table; a single value pastes into the cell as usual.
  const onPaste = (e: ClipboardEvent<HTMLTableElement>) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t,\n]/.test(text)) return;
    e.preventDefault();
    const parsed = attempt(() => parseDelimited(text));
    if (!parsed.ok) {
      onPasteError?.(parsed.error);
      return;
    }
    const applied = attempt(() => pasteTable(parsed.value));
    if (!applied.ok) onPasteError?.(applied.error);
  };

  return (
    <div className="data-table">
      <table onPaste={onPaste}>
        <thead>
          <tr>
            <th aria-label="Row" />
            {columns.map((c, j) => (
              <th key={j} className={j === targetCol ? 'target-col' : undefined}>
                <input
                  className="header-name"
                  aria-label={`Column ${j + 1} name`}
                  value={c.name}
                  onChange={(e) => setColumnInfo(j, { name: e.target.value })}
                />
                <input
                  className="header-unit"
                  aria-label={`Column ${j + 1} unit`}
                  placeholder="unit"
                  value={c.unit}
                  onChange={(e) => setColumnInfo(j, { unit: e.target.value })}
                />
                <label className="target-toggle">
                  <input type="radio" name="target-col" checked={j === targetCol} onChange={() => setTargetCol(j)} />{' '}
                  target
                </label>
              </th>
            ))}
            <th aria-label="Remove row" />
          </tr>
        </thead>
        <tbody>
          {cells.map((row, i) => (
            <tr
              key={i}
              className={i === selectedRow ? 'selected' : undefined}
              onClick={() => selectRow(i === selectedRow ? null : i)}
            >
              <th scope="row" className="row-label">
                <span className="row-swatch" style={{ background: dataRowColor(i) }} aria-hidden />
                {rowLabels[i]}
              </th>
              {row.map((value, j) => (
                <td key={j}>
                  <input
                    aria-label={`${rowLabels[i]}, ${columns[j]?.name}`}
                    className={isInvalid(i, j) ? 'cell invalid' : 'cell'}
                    style={{ borderBottomColor: dataRowColor(i) }}
                    value={value}
                    onChange={(e) => setCell(i, j, e.target.value)}
                    onKeyDown={onCellKeyDown}
                    data-row={i}
                    data-col={j}
                  />
                </td>
              ))}
              <td>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${rowLabels[i]}`}
                  disabled={cells.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRow(i);
                  }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="editor-buttons">
        <button type="button" onClick={addRow} disabled={cells.length >= MAX_DATA_ROWS}>
          + row
        </button>
        <button type="button" onClick={addColumn} disabled={featureCount >= MAX_FEATURES}>
          + feature
        </button>
        <button type="button" onClick={() => removeColumn(lastFeature)} disabled={featureCount <= 1}>
          − feature
        </button>
        <span className="hint">Paste from a spreadsheet or CSV to replace the table.</span>
      </div>
    </div>
  );
}
