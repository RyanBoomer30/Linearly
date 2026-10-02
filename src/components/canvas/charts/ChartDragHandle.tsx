import { DragHandle } from '../primitives/DragHandle';
import { fromWorld, toWorld, useChartFrame } from './frame';

/** F-C4 for charts: a draggable point in data coordinates (line handles L2-L1, predict marker L2-D5). */
export function ChartDragHandle({
  at,
  color,
  onDrag,
}: {
  at: [number, number];
  color: string;
  onDrag: (next: [number, number]) => void;
}) {
  const frame = useChartFrame();
  return <DragHandle planar position={toWorld(frame, at)} color={color} onDrag={(p) => onDrag(fromWorld(frame, p))} />;
}
