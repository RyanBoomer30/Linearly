import { useState } from 'react';

export interface StepperState {
  index: number;
  count: number;
  playing: boolean;
  /** Steps per second. */
  speed: number;
  first: () => void;
  prev: () => void;
  next: () => void;
  last: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
}

/**
 * F-S1 / F-S4: current-step state for any Trace. Canvases and the matrix
 * display read `index` to redraw.
 * TODO: playback timer (advance at `speed`, stop at the last step), and
 * reset to 0 when the trace changes.
 */
export function useStepper(count: number): StepperState {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const clamp = (k: number) => Math.max(0, Math.min(count - 1, k));

  return {
    index: clamp(index),
    count,
    playing,
    speed,
    first: () => setIndex(0),
    prev: () => setIndex((k) => clamp(k - 1)),
    next: () => setIndex((k) => clamp(k + 1)),
    last: () => setIndex(count - 1),
    togglePlay: () => setPlaying((p) => !p),
    setSpeed,
  };
}
