import { useEffect, useState } from 'react';

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
  /** Jump to step k (clamped), e.g. to keep the position when a view swaps traces (L3-MM4). */
  goTo: (k: number) => void;
}

/**
 * F-S1 / F-S4: current-step state for any Trace. Canvases and the matrix
 * display read `index` to redraw. `resetKey` (e.g. the input matrix) sends
 * the stepper back to the first step when the trace changes.
 */
export function useStepper(count: number, resetKey?: unknown): StepperState {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const clamp = (k: number) => Math.max(0, Math.min(count - 1, k));

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [count, resetKey]);

  useEffect(() => {
    if (!playing) return;
    if (index >= count - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setIndex((k) => clamp(k + 1)), 1000 / speed);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, count, speed]);

  return {
    index: clamp(index),
    count,
    playing,
    speed,
    first: () => setIndex(0),
    prev: () => setIndex((k) => clamp(k - 1)),
    next: () => setIndex((k) => clamp(k + 1)),
    last: () => setIndex(count - 1),
    togglePlay: () => {
      // Play from the start when already at the end.
      if (!playing && index >= count - 1) setIndex(0);
      setPlaying((p) => !p);
    },
    setSpeed,
    goTo: (k) => setIndex(clamp(k)),
  };
}
