import type { KeyboardEvent } from 'react';
import { columnColor } from '../../theme/colors';
import { useStore } from '../../store/useStore';

interface MatrixEditorProps {
  /** Show the b column (F-E1). Ignored when the store has no b. */
  showB?: boolean;
  /** Cells to highlight as invalid ([row, col]; col = n is the b column) (F-E2). */
  invalid?: [number, number][];
  /** Column clicked (CR view, L1-P4). */
  onColumnClick?: (j: number) => void;
}

/**
 * F-E1–F-E5: grid editor for A (and optionally b). Each column header uses
 * that column's color. Cells hold raw strings; parsing happens in useSystem.
 */
export function MatrixEditor({ showB = true, invalid = [], onColumnClick }: MatrixEditorProps) {
  const { aCells, bCells, setCell, setBCell, addRow, removeRow, addColumn, removeColumn } = useStore();
  const m = aCells.length;
  const n = aCells[0]?.length ?? 0;
  const withB = showB && bCells !== null;
  const isInvalid = (i: number, j: number) => invalid.some(([r, c]) => r === i && c === j);

  return (
    <div className="matrix-editor">
      <table>
        <thead>
          <tr>
            {Array.from({ length: n }, (_, j) => (
              <th key={j} style={{ color: columnColor(j) }}>
                <button type="button" className="col-header" onClick={() => onColumnClick?.(j)}>
                  a<sub>{j + 1}</sub>
                </button>
              </th>
            ))}
            {withB && <th className="b-col">b</th>}
          </tr>
        </thead>
        <tbody>
          {aCells.map((row, i) => (
            <tr key={i}>
              {row.map((value, j) => (
                <td key={j}>
                  <input
                    aria-label={`A row ${i + 1} column ${j + 1}`}
                    className={isInvalid(i, j) ? 'cell invalid' : 'cell'}
                    style={{ borderBottomColor: columnColor(j) }}
                    value={value}
                    onChange={(e) => setCell(i, j, e.target.value)}
                    onKeyDown={onCellKeyDown}
                    data-row={i}
                    data-col={j}
                  />
                </td>
              ))}
              {withB && (
                <td className="b-col">
                  <input
                    aria-label={`b row ${i + 1}`}
                    className={isInvalid(i, n) ? 'cell invalid' : 'cell'}
                    value={bCells![i]}
                    onChange={(e) => setBCell(i, e.target.value)}
                    onKeyDown={onCellKeyDown}
                    data-row={i}
                    data-col={n}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="editor-buttons">
        <button type="button" onClick={addRow} disabled={m >= 4}>+ row</button>
        <button type="button" onClick={removeRow} disabled={m <= 1}>− row</button>
        <button type="button" onClick={addColumn} disabled={n >= 4}>+ col</button>
        <button type="button" onClick={removeColumn} disabled={n <= 1}>− col</button>
      </div>
    </div>
  );
}

/**
 * F-E5: arrow keys / Enter move between cells (Tab works natively). Left and
 * right only leave a cell when the caret is already at its edge.
 */
export function onCellKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  const row = Number(input.dataset.row);
  const col = Number(input.dataset.col);
  const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
  const atEnd = input.selectionStart === input.value.length;
  const moves: Record<string, [number, number] | undefined> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    Enter: e.shiftKey ? [-1, 0] : [1, 0],
    ArrowLeft: atStart ? [0, -1] : undefined,
    ArrowRight: atEnd ? [0, 1] : undefined,
  };
  const move = moves[e.key];
  if (!move) return;
  const target = input
    .closest('table')
    ?.querySelector<HTMLInputElement>(`input[data-row="${row + move[0]}"][data-col="${col + move[1]}"]`);
  if (!target) return;
  e.preventDefault();
  target.focus();
  target.select();
}
