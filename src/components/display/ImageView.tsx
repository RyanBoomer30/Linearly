import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { FloatMatrix } from '../../core/float';
import { toPixels, toSignedPixels } from '../../core/image';
import { attempt } from '../../store/useSystem';
import { ViewNotice } from './ViewNotice';

interface ImageViewProps {
  /** Gray values 0 … 255 (or signed values when `signed`). */
  matrix: FloatMatrix;
  /** Map −max|x| … +max|x| to black … white with 0 at mid-gray (layers, eigenfaces, A − Aₖ). */
  signed?: boolean;
  caption?: string;
  /** Largest displayed width in CSS pixels; the image scales to fit. */
  maxWidth?: number;
  /** Show the zoom buttons and the pixel-value readout. */
  interactive?: boolean;
  /** A fixed display height in CSS pixels (the width stays maxWidth), e.g. for a 1 × n row unrolled from an image. */
  height?: number;
}

/**
 * F-D13: a matrix shown as a grayscale image, with zoom and the value under
 * the pointer. Pixels stay crisp (no smoothing) so single entries can be seen.
 */
export function ImageView({ matrix, signed = false, caption, maxWidth = 420, interactive = true, height }: ImageViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<{ row: number; col: number; value: number } | null>(null);
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const pixels = useMemo(() => attempt(() => (signed ? toSignedPixels(matrix) : toPixels(matrix))), [matrix, signed]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !pixels.ok || cols === 0) return;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels.value), cols, rows), 0, 0);
  }, [pixels, rows, cols]);

  if (!pixels.ok) return <ViewNotice error={pixels.error} />;
  // Large images shrink to fit; small ones (64 × 64 faces) grow by a whole factor so pixels stay square and crisp.
  const fit = cols > maxWidth ? maxWidth / cols : Math.max(1, Math.floor(maxWidth / Math.max(1, cols)));
  const width = height ? maxWidth : cols * fit * zoom;

  const onMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - box.left) / box.width) * cols);
    const row = Math.floor(((e.clientY - box.top) / box.height) * rows);
    if (row >= 0 && row < rows && col >= 0 && col < cols) setHover({ row, col, value: matrix[row][col] });
  };

  return (
    <figure className="image-view">
      <div className="image-view-frame" style={{ maxWidth }}>
        <canvas
          ref={canvas}
          width={cols}
          height={rows}
          style={{ width, height: height ?? 'auto', imageRendering: 'pixelated' }}
          onMouseMove={interactive ? onMove : undefined}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={caption ?? `${rows} × ${cols} image`}
        />
      </div>
      {interactive && (
        <div className="image-view-tools">
          <button type="button" onClick={() => setZoom((z) => Math.max(1, z / 2))} disabled={zoom <= 1} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={() => setZoom((z) => Math.min(16, z * 2))} aria-label="Zoom in">
            +
          </button>
          <span className="caption">
            {rows} × {cols}
            {hover && ` · (${hover.row + 1}, ${hover.col + 1}) = ${Number(hover.value.toPrecision(4))}`}
          </span>
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** F-D13: a set of images, e.g. eigenfaces or individual rank-1 layers. */
export function ImageGrid({ images, signed = false, size = 96 }: { images: { matrix: FloatMatrix; caption: string }[]; signed?: boolean; size?: number }) {
  return (
    <div className="image-grid">
      {images.map((im, i) => (
        <ImageView key={i} matrix={im.matrix} signed={signed} caption={im.caption} maxWidth={size} interactive={false} />
      ))}
    </div>
  );
}
