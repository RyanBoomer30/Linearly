import { onCellKeyDown } from './MatrixEditor';

interface GridEditorProps {
  /** Shown above the grid, e.g. "A" or "B (m × p)". */
  label: string;
  cells: string[][];
  onChange: (row: number, col: number, value: string) => void;
  /** [row, col] of cells to highlight as invalid (F-E2). */
  invalid?: [number, number][];
  /** Column header text, e.g. j => `b${j + 1}`; no header row when omitted. */
  columnHeader?: (j: number) => string;
  columnColor?: (j: number) => string | undefined;
  /** Resize buttons; omitted buttons are hidden. */
  onAddRow?: () => void;
  onRemoveRow?: () => void;
  onAddColumn?: () => void;
  onRemoveColumn?: () => void;
  maxSize?: number;
  /** What a column is, for the + / − buttons ("col", "b"). */
  columnNoun?: string;
}

/**
 * F-E1–F-E5 for any grid (Lesson 3's A, B, C and right-hand sides). The
 * Lesson 1 MatrixEditor is wired to its store; this one is controlled.
 */
export function GridEditor({
  label,
  cells,
  onChange,
  invalid = [],
  columnHeader,
  columnColor,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  maxSize = 4,
  columnNoun = 'col',
}: GridEditorProps) {
  const m = cells.length;
  const n = cells[0]?.length ?? 0;
  const isInvalid = (i: number, j: number) => invalid.some(([r, c]) => r === i && c === j);
  return (
    <div className="matrix-editor grid-editor">
      <div className="grid-editor-label">{label}</div>
      <table>
        {columnHeader && (
          <thead>
            <tr>
              {Array.from({ length: n }, (_, j) => (
                <th key={j} style={{ color: columnColor?.(j) }}>
                  {columnHeader(j)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {cells.map((row, i) => (
            <tr key={i}>
              {row.map((value, j) => (
                <td key={j}>
                  <input
                    aria-label={`${label} row ${i + 1} column ${j + 1}`}
                    className={isInvalid(i, j) ? 'cell invalid' : 'cell'}
                    style={{ borderBottomColor: columnColor?.(j) }}
                    value={value}
                    onChange={(e) => onChange(i, j, e.target.value)}
                    onKeyDown={onCellKeyDown}
                    data-row={i}
                    data-col={j}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(onAddRow || onRemoveRow || onAddColumn || onRemoveColumn) && (
        <div className="editor-buttons">
          {onAddRow && (
            <button type="button" onClick={onAddRow} disabled={m >= maxSize}>
              + row
            </button>
          )}
          {onRemoveRow && (
            <button type="button" onClick={onRemoveRow} disabled={m <= 1}>
              − row
            </button>
          )}
          {onAddColumn && (
            <button type="button" onClick={onAddColumn} disabled={n >= maxSize}>
              + {columnNoun}
            </button>
          )}
          {onRemoveColumn && (
            <button type="button" onClick={onRemoveColumn} disabled={n <= 1}>
              − {columnNoun}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
