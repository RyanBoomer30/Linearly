import { Html } from '@react-three/drei';
import type { ReactNode } from 'react';
import { Tex } from '../../display/Tex';
import type { Vec3 } from '../types';

interface LabelProps {
  position: Vec3;
  children?: ReactNode;
  /** Rendered with KaTeX instead of children when given. */
  tex?: string;
  color?: string;
}

/** F-C3: HTML / KaTeX label pinned to a scene position. */
export function Label({ position, children, tex, color }: LabelProps) {
  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <span className="scene-label" style={{ color }}>
        {tex ? <Tex tex={tex} /> : children}
      </span>
    </Html>
  );
}
