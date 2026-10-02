import { Line } from '@react-three/drei';
import { toWorld, useChartFrame } from './frame';

/** F-C8: a segment in data coordinates, e.g. a vertical residual from (x, y) to (x, h(x)). */
export function Segment({
  from,
  to,
  color,
  lineWidth = 2,
  dashed = false,
}: {
  from: number[];
  to: number[];
  color: string;
  lineWidth?: number;
  dashed?: boolean;
}) {
  const frame = useChartFrame();
  return (
    <Line
      points={[toWorld(frame, from), toWorld(frame, to)]}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={0.15}
      gapSize={0.1}
    />
  );
}
