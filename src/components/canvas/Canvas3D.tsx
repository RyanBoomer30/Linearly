import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useRef, type ComponentRef, type ReactNode } from 'react';
import { useSceneColors } from '../../theme/useTheme';
import { LabelLayerContext } from './LabelLayer';
import { Axes } from './primitives/Axes';
import { GridLines } from './primitives/GridLines';
import { FitBridge } from './primitives/useAutoFit';
import type { Vec3 } from './types';

interface Canvas3DProps {
  children?: ReactNode;
  extent?: number;
  cameraPosition?: Vec3;
  /** Points to frame on load and on Auto-fit (F-C6). */
  fit?: Vec3[];
}

/** F-C2: perspective camera, orbit controls, labeled x/y/z axes, reset-view button. z is up. */
export function Canvas3D({ children, extent = 6, cameraPosition = [10, 8, 7], fit }: Canvas3DProps) {
  const colors = useSceneColors();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const labels = useRef<HTMLDivElement>(null);
  const fitRef = useRef<(() => void) | null>(null);

  return (
    <div className="canvas-frame">
      <Canvas camera={{ position: cameraPosition, up: [0, 0, 1], fov: 45, near: 0.1, far: 1000 }}>
        <color attach="background" args={[colors.background]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 10]} intensity={0.8} />
        <OrbitControls ref={controls} makeDefault />
        <GridLines extent={extent} color={colors.grid} />
        <LabelLayerContext.Provider value={labels}>
          <Axes extent={extent} dims={3} color={colors.axis} labelColor={colors.text} />
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
        <button type="button" onClick={() => controls.current?.reset()}>
          Reset view
        </button>
      </div>
    </div>
  );
}
