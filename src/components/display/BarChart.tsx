export interface Bar {
  label: string;
  value: number;
  color: string;
  /** Text above the bar; the value with 3 decimals when omitted. */
  valueLabel?: string;
}

interface BarChartProps {
  bars: Bar[];
  /** F-C13 overlay on the same scale, one per bar (e.g. simulated shares against exact probabilities). */
  overlay?: number[];
  overlayLabel?: string;
  /** Top of the scale; 1 for distributions. */
  max?: number;
  caption?: string;
}

const WIDTH = 360;
const HEIGHT = 200;
const PAD = { top: 22, bottom: 28, left: 34, right: 8 };

/** F-C13: a bar chart for a distribution over named states, with an optional overlay. */
export function BarChart({ bars, overlay, overlayLabel, max = 1, caption }: BarChartProps) {
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(1, bars.length);
  const barW = slot * 0.6;
  const y = (v: number) => PAD.top + plotH * (1 - Math.max(0, Math.min(v, max)) / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  return (
    <figure className="bar-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={caption ?? 'bar chart'}>
        {ticks.map((t) => (
          <g key={t} className="bar-chart-tick">
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} />
            <text x={PAD.left - 4} y={y(t)} textAnchor="end" dominantBaseline="central">
              {+t.toFixed(2)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          return (
            <g key={b.label}>
              <rect x={x} y={y(b.value)} width={barW} height={Math.max(0, y(0) - y(b.value))} fill={b.color} opacity={0.85} />
              <text x={x + barW / 2} y={y(Math.max(b.value, overlay?.[i] ?? 0)) - 6} textAnchor="middle" className="bar-value">
                {b.valueLabel ?? b.value.toFixed(3)}
              </text>
              <text x={x + barW / 2} y={HEIGHT - PAD.bottom + 16} textAnchor="middle" fill={b.color} className="bar-label">
                {b.label}
              </text>
              {overlay?.[i] !== undefined && (
                <line className="bar-overlay" x1={x - 4} x2={x + barW + 4} y1={y(overlay[i])} y2={y(overlay[i])} />
              )}
            </g>
          );
        })}
      </svg>
      {(caption || overlayLabel) && (
        <figcaption>
          {caption}
          {overlay && overlayLabel && <span className="bar-overlay-key"> — {overlayLabel}</span>}
        </figcaption>
      )}
    </figure>
  );
}
