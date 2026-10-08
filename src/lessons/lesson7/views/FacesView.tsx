import { useMemo, useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { ImageGrid, ImageView } from '../../../components/display/ImageView';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { StepperControls } from '../../../components/stepper/StepperControls';
import { useStepper } from '../../../components/stepper/useStepper';
import { generateFaces } from '../../../core/faces';
import { useLesson7Store } from '../../../store/useLesson7Store';
import { attempt } from '../../../store/useSystem';
import { dataRowColor } from '../../../theme/colors';
import { faceView, recognitionRate, unrollFrames } from '../models';
import { LineChart, Scatter2D } from './shared';

const SIZES = [32, 48, 64];

/** §11.8 */
export function FacesView() {
  const { faceOptions, faceComponents, faceQuery, faceIndex, faceUpload, setFaceOptions, newFaceSeed, setFaceComponents, setFaceQuery, setFaceIndex, loadFaceUpload } =
    useLesson7Store();
  const set = useMemo(() => attempt(() => generateFaces(faceOptions)), [faceOptions]);
  const view = useMemo(
    () => (set.ok ? attempt(() => faceView(set.value, faceComponents, faceQuery, faceIndex, faceUpload)) : null),
    [set, faceComponents, faceQuery, faceIndex, faceUpload],
  );
  const rate = useMemo(() => (set.ok ? attempt(() => recognitionRate(set.value, [1, 2, 4, 6, 10, 15, 20, 30])) : null), [set]);
  const unroll = useMemo(() => (set.ok && set.value.images[0] ? attempt(() => unrollFrames(set.value.images[0])) : null), [set]);
  const frames = unroll?.ok ? unroll.value : [];
  const stepper = useStepper(frames.length);
  const frame = frames[stepper.index];
  const [noise, setNoise] = useState(30);
  const total = set.ok ? set.value.images.length : faceOptions.people * faceOptions.variations;

  return (
    <ModuleLayout
      controls={
        <>
          <Caption section="§7.5">
            Each a × b face becomes a row of length ab. PCA of the N × ab matrix gives &quot;eigenfaces&quot;; a new face is
            recognized by projecting it and finding the nearest face in the reduced coordinates.
          </Caption>
          <fieldset>
            <legend>Generated faces (no real person)</legend>
            <label className="sliders">
              <span>People: {faceOptions.people}</span>
              <input type="range" min={3} max={30} step={1} value={faceOptions.people} onChange={(e) => setFaceOptions({ people: Number(e.target.value) })} />
            </label>
            <label className="sliders">
              <span>Variations each: {faceOptions.variations}</span>
              <input type="range" min={3} max={10} step={1} value={faceOptions.variations} onChange={(e) => setFaceOptions({ variations: Number(e.target.value) })} />
            </label>
            <label>
              Size{' '}
              <select value={faceOptions.size} onChange={(e) => setFaceOptions({ size: Number(e.target.value) })}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} × {s}
                  </option>
                ))}
              </select>
            </label>
            <p className="caption">
              Seed {faceOptions.seed}{' '}
              <button type="button" className="link-button" onClick={() => attempt(newFaceSeed)}>
                New seed
              </button>
            </p>
          </fieldset>
          <label className="sliders">
            <span>Components m = {faceComponents}</span>
            <input type="range" min={1} max={Math.max(1, total - faceOptions.people - 1)} step={1} value={faceComponents} onChange={(e) => setFaceComponents(Number(e.target.value))} />
          </label>
          <fieldset>
            <legend>Query</legend>
            <div className="segmented" role="group" aria-label="Query">
              <button type="button" className={faceQuery.kind === 'heldOut' ? 'active' : undefined} onClick={() => setFaceQuery({ kind: 'heldOut', person: 0 })}>
                Held-out face
              </button>
              <button type="button" className={faceQuery.kind === 'noisy' ? 'active' : undefined} onClick={() => setFaceQuery({ kind: 'noisy', index: 0, noise })}>
                Noisy database face
              </button>
              <button type="button" className={faceQuery.kind === 'upload' ? 'active' : undefined} onClick={() => setFaceQuery({ kind: 'upload' })}>
                Upload
              </button>
            </div>
            {faceQuery.kind === 'heldOut' && (
              <label>
                Person{' '}
                <select value={faceQuery.person} onChange={(e) => setFaceQuery({ kind: 'heldOut', person: Number(e.target.value) })}>
                  {Array.from({ length: faceOptions.people }, (_, p) => (
                    <option key={p} value={p}>
                      Person {p + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {faceQuery.kind === 'noisy' && (
              <>
                <label className="sliders">
                  <span>Face {faceQuery.index + 1}</span>
                  <input type="range" min={0} max={Math.max(0, total - faceOptions.people - 1)} value={faceQuery.index} onChange={(e) => setFaceQuery({ ...faceQuery, index: Number(e.target.value) })} />
                </label>
                <label className="sliders">
                  <span>Noise ±{noise}</span>
                  <input type="range" min={0} max={120} step={5} value={noise} onChange={(e) => { setNoise(Number(e.target.value)); setFaceQuery({ ...faceQuery, noise: Number(e.target.value) }); }} />
                </label>
              </>
            )}
            {faceQuery.kind === 'upload' && (
              <>
                <label className="file-button">
                  Choose an image
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadFaceUpload(e.target.files[0]).catch(() => undefined)} />
                </label>
                <p className="caption">Uploaded images stay in your browser and are never sent anywhere.</p>
              </>
            )}
          </fieldset>
          <label className="sliders">
            <span>Face to reconstruct: {faceIndex + 1}</span>
            <input type="range" min={0} max={Math.max(0, total - faceOptions.people - 1)} value={faceIndex} onChange={(e) => setFaceIndex(Number(e.target.value))} />
          </label>
        </>
      }
    >
      {!set.ok && <ViewNotice error={set.error} />}
      <section>
        <h3>From an image to a row</h3>
        {unroll && !unroll.ok && <ViewNotice error={unroll.error} />}
        {frame && (
          <>
            <StepperControls stepper={stepper} description={`${frame.rowsDone} row${frame.rowsDone === 1 ? '' : 's'} laid end to end`} />
            <div className="image-pair">
              {set.ok && <ImageView matrix={set.value.images[0]} caption={`A ${set.value.size} × ${set.value.size} face`} maxWidth={128} interactive={false} />}
              {frame.row.length > 0 && (
                <ImageView
                  matrix={[frame.row]}
                  caption={`The first ${frame.rowsDone} rows laid end to end: length ${frame.row.length} of ${faceOptions.size * faceOptions.size}`}
                  maxWidth={Math.max(8, Math.round((640 * frame.row.length) / (faceOptions.size * faceOptions.size)))}
                  height={24}
                  interactive={false}
                />
              )}
            </div>
          </>
        )}
      </section>
      {view && !view.ok && <ViewNotice error={view.error} />}
      {view?.ok && (
        <>
          <section>
            <h3>The mean face and the eigenfaces</h3>
            <div className="image-pair">
              <ImageView matrix={view.value.mean} caption="Mean face μ" maxWidth={128} interactive={false} />
              <ImageGrid images={view.value.eigenfaces.map((m, i) => ({ matrix: m, caption: `v${i + 1}` }))} signed size={96} />
            </div>
            <p className="caption">
              Beyond the notes: the components come from the thin SVD of the centered N × n matrix. The n × n covariance matrix
              would be far too large ({faceOptions.size ** 2} × {faceOptions.size ** 2} here), and the SVD gives the same vectors.
            </p>
          </section>
          <section>
            <h3>Reconstruction with m = {view.value.m}</h3>
            <div className="image-pair">
              <ImageView matrix={view.value.original} caption="Original" maxWidth={160} interactive={false} />
              <ImageView matrix={view.value.reconstruction} caption={`μ + wV_pcaᵀ (${(view.value.explained * 100).toFixed(1)}% of variance)`} maxWidth={160} interactive={false} />
            </div>
          </section>
          <section>
            <h3>Recognition</h3>
            <div className="image-pair">
              <ImageView matrix={view.value.query} caption={view.value.queryPerson === null ? 'Query' : `Query (person ${view.value.queryPerson + 1})`} maxWidth={128} interactive={false} />
              <ol className="match-list">
                {view.value.matches.map((m) => (
                  <li key={m.index} style={{ color: dataRowColor(m.person) }}>
                    Person {m.person + 1} · distance {m.distance.toFixed(1)}
                  </li>
                ))}
              </ol>
            </div>
            {view.value.correct !== null && (
              <p className={view.value.correct ? 'hit' : 'solution-msg warn'}>{view.value.correct ? '✓ Matched the right person.' : '✗ The closest face belongs to someone else.'}</p>
            )}
            <Scatter2D
              frame={view.value.frame}
              points={[...view.value.scatter.map((s) => s.point), view.value.queryPoint]}
              colors={[...view.value.scatter.map((s) => dataRowColor(s.person)), '#000000']}
            />
            <p className="caption">Every face&apos;s first two coordinates (w₁, w₂), colored by person; the black point is the query.</p>
          </section>
        </>
      )}
      <section>
        <h3>Recognition rate against m</h3>
        {rate && !rate.ok && <ViewNotice error={rate.error} />}
        {rate?.ok && <LineChart frame={rate.value.frame} series={[{ label: 'held-out faces matched', color: '#0072B2', points: rate.value.points }]} />}
      </section>
    </ModuleLayout>
  );
}
