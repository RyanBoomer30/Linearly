import { GridEditor } from '../../../components/editor/GridEditor';
import { Tex } from '../../../components/display/Tex';
import { useLesson4Store } from '../../../store/useLesson4Store';
import { useLesson4System } from '../../../store/useLesson4System';
import { attempt } from '../../../store/useSystem';

/** §8.1 editors for x, w and y, side by side as columns, with the ℝ² / ℝ³ switch. */
export function VectorEditors() {
  const { xCells, wCells, yCells, setVectorCell, setReflectorDim, snapWToAxis } = useLesson4Store();
  const system = useLesson4System();
  const invalid = system.ok ? system.value.invalid : { x: [], w: [], y: [] };
  const dim = xCells.length as 2 | 3;
  const column = (which: 'x' | 'w' | 'y', cells: string[], label: string) => (
    <GridEditor
      label={label}
      cells={cells.map((c) => [c])}
      onChange={(i, _j, v) => setVectorCell(which, i, v)}
      invalid={invalid[which].map((i) => [i, 0] as [number, number])}
    />
  );
  return (
    <>
      <div className="segmented" role="group" aria-label="Dimension">
        {([2, 3] as const).map((d) => (
          <button key={d} type="button" className={dim === d ? 'active' : undefined} onClick={() => attempt(() => setReflectorDim(d))}>
            ℝ{d === 2 ? '²' : '³'}
          </button>
        ))}
      </div>
      <div className="product-editors">
        {column('x', xCells, 'x')}
        {column('w', wCells, 'w')}
        {column('y', yCells, 'y (any vector)')}
      </div>
      <button type="button" onClick={() => attempt(snapWToAxis)}>
        Snap w to the axis: <Tex tex="w = \|x\|e_1" />
      </button>
    </>
  );
}
