import { Tex } from './Tex';

export interface MatrixHighlights {
  /** Text color per column, e.g. column colors (F-E4). */
  columnColors?: (string | undefined)[];
  /** Background per row, e.g. rows changed by the current step (F-S3). */
  rowBackgrounds?: (string | undefined)[];
  /** Background for specific entries, e.g. pivots (L1-G2). Key: "row,col". */
  entryBackgrounds?: Record<string, string>;
  /** Text color for specific entries, e.g. multipliers in red (Lesson 3). Key: "row,col". Wins over columnColors. */
  entryColors?: Record<string, string>;
}

interface MatrixTexProps {
  /** Entries already formatted as TeX (Rational.toTex()) or plain numbers. */
  entries: string[][];
  /** Draw a bar before the last column: [A | b]. */
  augmented?: boolean;
  highlights?: MatrixHighlights;
  display?: boolean;
}

/** F-D1: KaTeX matrix with per-row, per-column, and per-entry highlight colors. */
export function MatrixTex({ entries, augmented = false, highlights = {}, display = true }: MatrixTexProps) {
  return <Tex tex={matrixToTex(entries, augmented, highlights)} display={display} />;
}

export function matrixToTex(entries: string[][], augmented: boolean, h: MatrixHighlights): string {
  const cols = entries[0]?.length ?? 0;
  const spec = augmented && cols > 1 ? `${'c'.repeat(cols - 1)}|c` : 'c'.repeat(cols);
  const body = entries
    .map((row, i) =>
      row
        .map((entry, j) => {
          let cell = entry;
          const fg = h.entryColors?.[`${i},${j}`] ?? h.columnColors?.[j];
          if (fg) cell = `\\textcolor{${fg}}{${cell}}`;
          const bg = h.entryBackgrounds?.[`${i},${j}`] ?? h.rowBackgrounds?.[i];
          if (bg) cell = `\\colorbox{${bg}}{$${cell}$}`;
          return cell;
        })
        .join(' & '),
    )
    .join(' \\\\ ');
  const array = `\\left[\\begin{array}{${spec}} ${body} \\end{array}\\right]`;
  // Stacked fractions need taller rows, or neighboring rows overlap.
  return body.includes('\\frac') ? `{\\def\\arraystretch{1.6}${array}}` : array;
}
