import type { ReactNode } from 'react';
import type { SolutionMarker } from '../models';
import { MatrixEditor } from '../../../components/editor/MatrixEditor';
import { PresetPicker } from '../../../components/editor/PresetPicker';
import { useSystem } from '../../../store/useSystem';

const fmtTuple = (v: readonly number[]) => `(${v.map((x) => +x.toFixed(3)).join(', ')})`;

/** L1-R3: what the solution set is, in words. */
export function SolutionMessage({ marker, dim = 3 }: { marker: SolutionMarker; dim?: 2 | 3 }) {
  const fmt = (v: readonly number[]) => fmtTuple(v.slice(0, dim));
  switch (marker.kind) {
    case 'point':
      return <p className="solution-msg">Unique solution at {fmt(marker.at)}.</p>;
    case 'line':
      return <p className="solution-msg">Infinitely many solutions: the highlighted line {fmt(marker.point)} + t{fmt(marker.dir)}.</p>;
    case 'plane':
      return <p className="solution-msg">Infinitely many solutions: a whole plane.</p>;
    case 'none':
      return <p className="solution-msg warn" role="status">{marker.message}</p>;
  }
}

/** Shared sidebar: preset picker + matrix editor + view-specific extras. */
export function Controls({ children, showB = true, onColumnClick }: { children?: ReactNode; showB?: boolean; onColumnClick?: (j: number) => void }) {
  const system = useSystem();
  return (
    <>
      <PresetPicker />
      <MatrixEditor showB={showB} invalid={system.ok ? system.value.invalid : []} onColumnClick={onColumnClick} />
      {children}
    </>
  );
}
