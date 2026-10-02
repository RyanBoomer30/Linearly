import { notImplemented } from '../../core/notImplemented';
import type { PastedTable } from '../../store/useDataStore';

/**
 * F-T3: split pasted spreadsheet / CSV text into cells. Detects tab or comma
 * separators and an optional header row (a first row that does not parse as
 * numbers). Cells are kept as strings so bad ones can be highlighted.
 */
export function parseDelimited(text: string): PastedTable {
  return notImplemented('parseDelimited');
}
