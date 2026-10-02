import { Line } from '@react-three/drei';
import { Label } from '../primitives/Label';
import { toWorld, useChartFrame } from './frame';

/**
 * F-C10: a reference line of a given slope on a log–log chart, through a
 * point: y = through[1] · (x / through[0])^slope, drawn across the frame.
 */
export function SlopeLine({ slope, through, color, label }: { slope: number; through: [number, number]; color: string; label?: string }) {
  const frame = useChartFrame();
  const at = (x: number): [number, number] => [x, through[1] * (x / through[0]) ** slope];
  const a = at(frame.x.min);
  const b = at(frame.x.max);
  const end = toWorld(frame, b);
  return (
    <>
      <Line points={[toWorld(frame, a), end]} color={color} lineWidth={1.5} dashed dashSize={0.2} gapSize={0.15} />
      {label && (
        <Label position={[end[0] + 0.3, end[1], 0]} color={color}>
          {label}
        </Label>
      )}
    </>
  );
}
