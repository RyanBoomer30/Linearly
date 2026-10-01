import { Tex } from '../display/Tex';
import type { StepperState } from './useStepper';

interface StepperControlsProps {
  stepper: StepperState;
  /** F-S2: current operation in words and notation. */
  description?: string;
  tex?: string;
}

/** F-S1: first, previous, play/pause, next, last, speed. */
export function StepperControls({ stepper, description, tex }: StepperControlsProps) {
  const { index, count, playing, speed } = stepper;
  const atStart = index <= 0;
  const atEnd = index >= count - 1;
  return (
    <div className="stepper">
      <div className="stepper-buttons" role="group" aria-label="Step controls">
        <button type="button" onClick={stepper.first} disabled={atStart} aria-label="First step">⏮</button>
        <button type="button" onClick={stepper.prev} disabled={atStart} aria-label="Previous step">◀</button>
        <button type="button" onClick={stepper.togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button type="button" onClick={stepper.next} disabled={atEnd} aria-label="Next step">▶|</button>
        <button type="button" onClick={stepper.last} disabled={atEnd} aria-label="Last step">⏭</button>
        <label className="stepper-speed">
          Speed
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={speed}
            onChange={(e) => stepper.setSpeed(Number(e.target.value))}
          />
        </label>
        <span className="stepper-count">
          Step {count === 0 ? 0 : index + 1} / {count}
        </span>
      </div>
      {(description || tex) && (
        <div className="stepper-description">
          {description} {tex && <Tex tex={tex} />}
        </div>
      )}
    </div>
  );
}
