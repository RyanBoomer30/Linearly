import type { ReactNode } from 'react';
import { MatrixEditor } from '../../../components/editor/MatrixEditor';
import { PresetPicker } from '../../../components/editor/PresetPicker';
import { useSystem } from '../../../store/useSystem';

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
