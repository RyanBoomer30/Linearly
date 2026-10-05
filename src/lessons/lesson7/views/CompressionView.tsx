import { useMemo } from 'react';
import { Caption } from '../../../components/display/Caption';
import { ImageView } from '../../../components/display/ImageView';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { truncationUpdater } from '../../../core/lowRank';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { attempt } from '../../../store/useSystem';
import { compressionView, layerImage, leftoverImage } from '../models';
import { useImageSvd } from '../useImageSvd';
import { LineChart } from './shared';

/** §11.2 */
export function CompressionView() {
  const { image, imageName, imageK, kMode, cutoff, layerIndex, loadImageFile, useTestPattern, setImageK, setKMode, setCutoff, setLayerIndex, notice, dismissNotice } =
    useLesson7Store();
  const { state, cancel, restart } = useImageSvd(image);
  const svd = state.status === 'done' ? state.svd : null;
  const rows = image?.length ?? 0;
  const cols = image?.[0]?.length ?? 0;
  const view = useMemo(() => (svd ? attempt(() => compressionView(svd, rows, cols, imageK, kMode, cutoff)) : null), [svd, rows, cols, imageK, kMode, cutoff]);
  const updater = useMemo(() => (svd ? attempt(() => truncationUpdater(svd)) : null), [svd]);
  const k = view?.ok ? view.value.k : imageK;
  const approx = useMemo(() => (updater?.ok ? attempt(() => updater.value(k)) : null), [updater, k]);
  const leftover = useMemo(() => (image && approx?.ok ? attempt(() => leftoverImage(image, approx.value)) : null), [image, approx]);
  const layer = useMemo(() => (svd ? attempt(() => layerImage(svd, layerIndex)) : null), [svd, layerIndex]);
  const maxK = svd ? svd.sigma.length : Math.max(1, Math.min(rows, cols));

  return (
    <ModuleLayout
      controls={
        <>
          <Caption section="§7.0">
            A picture is a matrix of gray values. Keeping only the first k rank-1 pieces means sending k vectors of length m and
            k of length n instead of all mn numbers.
          </Caption>
          <div className="editor-buttons">
            <button type="button" onClick={() => attempt(useTestPattern)}>
              Use the test picture
            </button>
            <label className="file-button">
              Upload an image
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadImageFile(e.target.files[0]).catch(() => undefined)} />
            </label>
          </div>
          <p className="caption">Uploaded images stay in your browser and are never sent anywhere.</p>
          {imageName && <p className="caption">Image: {imageName}</p>}
          <div className="segmented" role="group" aria-label="How to choose k">
            <button type="button" className={kMode === 'slider' ? 'active' : undefined} onClick={() => setKMode('slider')}>
              Choose k
            </button>
            <button type="button" className={kMode === 'cutoff' ? 'active' : undefined} onClick={() => setKMode('cutoff')}>
              Keep σᵢ ≥ c·σ₁
            </button>
          </div>
          {kMode === 'slider' ? (
            <label className="sliders">
              <span>k = {imageK}</span>
              <input type="range" min={1} max={maxK} step={1} value={Math.min(imageK, maxK)} onChange={(e) => setImageK(Number(e.target.value))} />
            </label>
          ) : (
            <label className="sliders">
              <span>c = {cutoff} (the notes use 0.01)</span>
              <input type="range" min={-4} max={-0.3} step={0.05} value={Math.log10(cutoff)} onChange={(e) => setCutoff(Number((10 ** Number(e.target.value)).toPrecision(2)))} />
            </label>
          )}
          <label className="sliders">
            <span>Single layer i = {layerIndex + 1}</span>
            <input type="range" min={0} max={Math.max(0, maxK - 1)} step={1} value={Math.min(layerIndex, maxK - 1)} onChange={(e) => setLayerIndex(Number(e.target.value))} />
          </label>
          {notice && (
            <div className="view-notice" role="status">
              {notice}
              <button type="button" onClick={dismissNotice} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}
        </>
      }
    >
      {!image && <p className="caption">Load the test picture or upload an image to begin.</p>}
      {state.status === 'running' && (
        <div className="svd-progress">
          <progress value={state.progress} max={1} /> Computing the SVD in the background… {Math.round(state.progress * 100)}%{' '}
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}
      {state.status === 'error' && <ViewNotice error={state.message} />}
      {state.status === 'cancelled' && (
        <p>
          Cancelled.{' '}
          <button type="button" className="link-button" onClick={restart}>
            Start again
          </button>
        </p>
      )}
      {image && (
        <div className="image-pair">
          <ImageView matrix={image} caption={`Original (${rows} × ${cols})`} />
          {approx?.ok && <ImageView matrix={approx.value} caption={`Rank ${k}`} />}
          {approx && !approx.ok && <ViewNotice error={approx.error} />}
        </div>
      )}
      {view && !view.ok && <ViewNotice error={view.error} />}
      {view?.ok && (
        <>
          <p className="storage-readout">{view.value.storageText}</p>
          <p className="caption">
            {(view.value.energyKept * 100).toFixed(2)}% of ‖A‖² kept · relative error ‖A − Aₖ‖/‖A‖ ≈ {view.value.relativeError.toPrecision(3)}
          </p>
          <p className="caption">{view.value.tradeOff}</p>
          <section>
            <h3>Singular values</h3>
            <LineChart
              frame={view.value.chart.frame}
              series={[{ label: 'σᵢ', color: '#0072B2', points: view.value.chart.points, dots: false }]}
              curves={[
                { label: 'cutoff c·σ₁', color: '#D55E00', points: view.value.chart.cutoff },
                { label: 'k', color: '#009E73', points: view.value.chart.kMarker },
              ]}
            />
          </section>
        </>
      )}
      {svd && (
        <section>
          <h3>What is left out, and one layer on its own</h3>
          <div className="image-pair">
            {leftover?.ok && <ImageView matrix={leftover.value} signed caption={`A − A${k} (gray = 0)`} />}
            {layer?.ok && <ImageView matrix={layer.value} signed caption={`Layer σ${layerIndex + 1}u${layerIndex + 1}v${layerIndex + 1}ᵀ`} />}
            {layer && !layer.ok && <ViewNotice error={layer.error} />}
          </div>
          <p className="caption">The first layers carry broad shapes; later ones add fine detail.</p>
        </section>
      )}
    </ModuleLayout>
  );
}
