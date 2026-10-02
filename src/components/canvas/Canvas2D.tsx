import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import { useSceneColors } from '../../theme/useTheme';
import { LabelLayerContext } from './LabelLayer';
import { Axes } from './primitives/Axes';
import type { Vec3 } from './types';
import { GridLines } from './primitives/GridLines';
import { FitBridge } from './primitives/useAutoFit';

interface Canvas2DProps {
  children?: ReactNode;
  /** Half-width of the grid in world units. */
  extent?: number;
  /** Pixels per world unit. */
  zoom?: number;
  /** Points to frame on load and on Auto-fit (F-C6). */
  fit?: Vec3[];
  /** Skip the built-in grid and axes; data charts draw their own (F-C7). */
  bare?: boolean;
  /** Axis names, e.g. ['θ₀', 'θ₁'] for parameter space; defaults to x₁, x₂. */
  axisNames?: [string, string];
}

/** F-C1: orthographic camera, labeled axes, grid, pan and zoom (no rotation). */
export function Canvas2D({ children, extent = 8, zoom = 40, fit, bare = false, axisNames }: Canvas2DProps) {
  const colors = useSceneColors();
  const labels = useRef<HTMLDivElement>(null);
  const fitRef = useRef<(() => void) | null>(null);
  return (
    <div className="canvas-frame">
      <Canvas orthographic camera={{ position: [0, 0, 100], zoom, near: 0.1, far: 1000 }}>
        <color attach="background" args={[colors.background]} />
        <ambientLight intensity={1} />
        <OrbitControls makeDefault enableRotate={false} screenSpacePanning />
        {!bare && <GridLines extent={extent} color={colors.grid} />}
        <LabelLayerContext.Provider value={labels}>
          {!bare && <Axes extent={extent} dims={2} color={colors.axis} labelColor={colors.text} names={axisNames} />}
          {children}
        </LabelLayerContext.Provider>
        {fit && fit.length > 0 && <FitBridge points={fit} fitRef={fitRef} />}
      </Canvas>
      <div ref={labels} className="label-layer" />
      <div className="canvas-buttons">
        {fit && fit.length > 0 && (
          <button type="button" onClick={() => fitRef.current?.()}>
            Auto-fit
          </button>
        )}
      </div>
    </div>
  );
}
