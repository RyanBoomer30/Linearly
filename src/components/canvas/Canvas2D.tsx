import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { useSceneColors } from '../../theme/useTheme';
import { Axes } from './primitives/Axes';
import { GridLines } from './primitives/GridLines';

interface Canvas2DProps {
  children?: ReactNode;
  /** Half-width of the grid in world units. */
  extent?: number;
  /** Pixels per world unit. */
  zoom?: number;
}

/** F-C1: orthographic camera, labeled axes, grid, pan and zoom (no rotation). */
export function Canvas2D({ children, extent = 8, zoom = 40 }: Canvas2DProps) {
  const colors = useSceneColors();
  return (
    <div className="canvas-frame">
      <Canvas orthographic camera={{ position: [0, 0, 100], zoom, near: 0.1, far: 1000 }}>
        <color attach="background" args={[colors.background]} />
        <ambientLight intensity={1} />
        <OrbitControls makeDefault enableRotate={false} screenSpacePanning />
        <GridLines extent={extent} color={colors.grid} />
        <Axes extent={extent} dims={2} color={colors.axis} labelColor={colors.text} />
        {children}
      </Canvas>
    </div>
  );
}
