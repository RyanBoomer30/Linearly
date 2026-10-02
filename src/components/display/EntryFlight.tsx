import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import { attempt } from '../../store/useSystem';

/** A cell of a rendered KaTeX matrix (MatrixTex), by 0-based row and column. */
export interface CellRef {
  container: RefObject<HTMLElement | null>;
  row: number;
  col: number;
}

/** Find the on-screen box of entry (row, col) inside a rendered MatrixTex. Null when it isn't there. */
export function locateCell(container: HTMLElement, row: number, col: number): DOMRect | null {
  // KaTeX lays an array out column by column: .mtable > .col-align-* > … > .vlist > one span per row.
  const column = container.querySelectorAll('.mtable > [class*="col-align"]')[col];
  const cell = column?.querySelector('.vlist')?.children[row];
  const content = cell?.querySelector('.mord') ?? cell;
  return content ? content.getBoundingClientRect() : null;
}

/**
 * F-D9: an entry (a multiplier, a pivot) or a whole row travels from one
 * displayed matrix to another. Re-runs whenever `runKey` changes, e.g. the
 * stepper index. Draws nothing when either end can't be located.
 */
export function EntryFlight({ from, to, runKey, children, durationMs = 600 }: { from: CellRef; to: CellRef; runKey: unknown; children: ReactNode; durationMs?: number }) {
  const [flight, setFlight] = useState<{ start: DOMRect; end: DOMRect; arrived: boolean } | null>(null);

  useLayoutEffect(() => {
    const a = from.container.current;
    const b = to.container.current;
    if (!a || !b) return setFlight(null);
    const start = attempt(() => locateCell(a, from.row, from.col));
    const end = attempt(() => locateCell(b, to.row, to.col));
    if (!start.ok || !end.ok || !start.value || !end.value) return setFlight(null);
    setFlight({ start: start.value, end: end.value, arrived: false });
    const id = requestAnimationFrame(() => setFlight((f) => f && { ...f, arrived: true }));
    const done = window.setTimeout(() => setFlight(null), durationMs + 100);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  if (!flight) return null;
  const at = flight.arrived ? flight.end : flight.start;
  return (
    <div
      className="entry-flight"
      aria-hidden
      style={{ left: at.left, top: at.top, width: at.width, height: at.height, transition: `left ${durationMs}ms ease, top ${durationMs}ms ease` }}
    >
      {children}
    </div>
  );
}
