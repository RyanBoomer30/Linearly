import { Tex } from '../../../components/display/Tex';
import { useDataStore } from '../../../store/useDataStore';
import type { ThetaControls } from '../models';

/** θ sliders shared by the projection and loss views (L2-P2, L2-L1). θ is shared through the store (L2-P4). */
export function ThetaSliders({ controls }: { controls: ThetaControls }) {
  const setTheta = useDataStore((s) => s.setTheta);
  const values = controls.params.map((p) => p.value);
  return (
    <div className="sliders">
      {controls.params.map((p, k) => (
        <label key={k}>
          <span>
            <Tex tex={p.tex} /> = {+p.value.toFixed(3)}
          </span>
          <input
            type="range"
            min={p.min}
            max={p.max}
            step={p.step}
            value={p.value}
            onChange={(e) => setTheta(values.map((v, i) => (i === k ? Number(e.target.value) : v)))}
          />
        </label>
      ))}
      <div className="theta-status">
        {controls.atOptimum ? (
          <span className="hit">At θ*: the error is as small as it can be.</span>
        ) : (
          <button type="button" onClick={() => setTheta(null)}>
            Back to θ*
          </button>
        )}
      </div>
    </div>
  );
}
