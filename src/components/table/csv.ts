import { Rational } from '../../core/rational';
import type { PastedTable } from '../../store/useDataStore';

/**
 * F-T3: split pasted spreadsheet / CSV text into cells. Detects tab or comma
 * separators and an optional header row (a first row that does not parse as
 * numbers). Cells are kept as strings so bad ones can be highlighted.
 */
export function parseDelimited(text: string): PastedTable {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) throw new Error('Nothing to paste');
  const sep = lines.some((l) => l.includes('\t')) ? '\t' : ',';
  const rows = lines.map((l) => l.split(sep).map((c) => c.trim()));
  const width = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== width) throw new Error(`Row ${i + 1} has ${r.length} cells; row 1 has ${width}`);
  });
  const hasHeader = rows[0].some((c) => Rational.parse(c) === null);
  const cells = hasHeader ? rows.slice(1) : rows;
  if (cells.length === 0) throw new Error('The pasted table has a header but no data rows');
  return { header: hasHeader ? rows[0] : null, cells };
}
