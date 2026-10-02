import { Line } from '@react-three/drei';
import { toWorld, useChartFrame } from './frame';

/** F-C8: a sampled curve y = h(x) (see sampleCurve, F-M15). */
export function FunctionPlot({
  points,
  color,
  lineWidth = 3,
  dashed = false,
}: {
  points: [number, number][];
  color: string;
  lineWidth?: number;
  dashed?: boolean;
}) {
  const frame = useChartFrame();
  if (points.length < 2) return null;
  return (
    <Line
      points={points.map((p) => toWorld(frame, p))}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={0.2}
      gapSize={0.15}
    />
  );
}
