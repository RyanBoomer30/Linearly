import { attempt } from '../../store/useSystem';

/**
 * F-D8: diverging color for a value on a scale shared by several heatmaps:
 * negative → blue, 0 → neutral, positive → orange (color-blind safe).
 */
export function divergingColor(value: number, maxAbs: number): string {
  if (value === 0 || !(maxAbs > 0)) return 'transparent';
  const t = Math.min(1, Math.abs(value) / maxAbs);
  // Translucent fills read on both themes; zero shows the surface.
  const alpha = (0.15 + 0.7 * t).toFixed(3);
  return value < 0 ? `rgba(0, 114, 178, ${alpha})` : `rgba(213, 94, 0, ${alpha})`;
}

interface MatrixHeatmapProps {
  entries: number[][];
  /** Shared scale: the largest |entry| across every heatmap drawn together. */
  maxAbs: number;
  /** Text shown in each cell (e.g. exact values); none when omitted. */
  labels?: string[][];
  /** Caption under the grid, e.g. "layer 1, ‖·‖ ≈ 5.29". */
  caption?: string;
  /** Cells to outline, e.g. the row and column in use. Key: "row,col". */
  outlined?: Set<string>;
  cellSize?: number;
}

/** F-D8: a matrix as a grid of colored cells (rank-1 layers, L3-R1; peeling, L3-LU3). */
export function MatrixHeatmap({ entries, maxAbs, labels, caption, outlined, cellSize = 34 }: MatrixHeatmapProps) {
  const m = entries.length;
  const n = entries[0]?.length ?? 0;
  const width = n * cellSize;
  const height = m * cellSize;
  return (
    <figure className="matrix-heatmap">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={caption ?? 'matrix heatmap'}>
        {entries.map((row, i) =>
          row.map((v, j) => {
            const fill = attempt(() => divergingColor(v, maxAbs));
            const key = `${i},${j}`;
            return (
              <g key={key}>
                <rect
                  x={j * cellSize}
                  y={i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={fill.ok ? fill.value : 'var(--surface)'}
                  stroke={outlined?.has(key) ? 'var(--text)' : 'var(--border)'}
                  strokeWidth={outlined?.has(key) ? 2 : 1}
                />
                {labels && (
                  <text x={j * cellSize + cellSize / 2} y={i * cellSize + cellSize / 2} textAnchor="middle" dominantBaseline="central">
                    {labels[i][j]}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
