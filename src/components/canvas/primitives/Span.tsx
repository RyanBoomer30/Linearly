import { ParametricLine } from './Line2D';
import { Plane } from './Plane';
import type { Vec3 } from '../types';

interface SpanProps {
  /** One vector → line through the origin; two → plane through the origin. Must be independent. */
  vectors: Vec3[];
  color: string;
  opacity?: number;
  size?: number;
}

/** F-C3: span of 1 or 2 vectors through the origin. */
export function Span({ vectors, color, opacity, size }: SpanProps) {
  if (vectors.length === 1) {
    return <ParametricLine point={[0, 0, 0]} dir={vectors[0]} color={color} />;
  }
  if (vectors.length === 2) {
    return <Plane spanning={[vectors[0], vectors[1]]} color={color} opacity={opacity} size={size} />;
  }
  return null;
}
