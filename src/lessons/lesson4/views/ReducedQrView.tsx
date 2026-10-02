import { AnyMatrixTex, anyVectorEntries } from '../../../components/display/AnyMatrixTex';
import { Caption } from '../../../components/display/Caption';
import { MatrixHeatmap } from '../../../components/display/MatrixHeatmap';
import { PrecisionBadge } from '../../../components/display/PrecisionBadge';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { useLesson4Store } from '../../../store/useLesson4Store';
import { useStore } from '../../../store/useStore';
import { attempt } from '../../../store/useSystem';
import { reducedQrView } from '../models';
import { useLesson4 } from '../useLesson4';
import { CheckList } from './PropertiesView';
import { Controls } from './Controls';

/** Greys out the dropped parts. KaTeX needs a literal color, not a CSS variable. */
const GREY = '#a1a1aa';

/** §8.4 */
export function ReducedQrView() {
  const { sign, qrForm, setQrForm, openInLesson1 } = useLesson4Store();
  const view = useLesson4((s) => ({ ...reducedQrView(s.A, sign), A: s.A, b: s.b }), [sign]);
  const openSvd = () =>
    view.ok &&
    attempt(() => {
      openInLesson1(view.value.A, view.value.b, 'bigPicture');
      useStore.getState().setBigPictureMode('svd');
    });

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§4.4">The last m − n columns of Q only ever multiply zero rows of R, so they can be dropped.</Caption>
          <div className="segmented" role="group" aria-label="QR form">
            <button type="button" className={qrForm === 'full' ? 'active' : undefined} onClick={() => setQrForm('full')}>
              Full QR
            </button>
            <button type="button" className={qrForm === 'reduced' ? 'active' : undefined} onClick={() => setQrForm('reduced')}>
              Reduced QR
            </button>
          </div>
        </Controls>
      }
    >
      {!view.ok && <ViewNotice error={view.error} />}
      {view.ok && (
        <>
          <div className="panel-header">
            <PrecisionBadge precision={view.value.precision} />
          </div>
          <div className="matrix-pair">
            <Tex tex="A =" />
            {qrForm === 'full' ? (
              <>
                <AnyMatrixTex M={view.value.Q} highlights={{ columnColors: view.value.Q[0]?.map((_, j) => (view.value.dropped.columns.includes(j) ? GREY : undefined)) }} />
                <AnyMatrixTex
                  M={view.value.R}
                  highlights={{
                    entryColors: Object.fromEntries(
                      view.value.dropped.rows.flatMap((i) => view.value.R[i].map((_, j) => [`${i},${j}`, GREY])),
                    ),
                  }}
                />
              </>
            ) : (
              <>
                <AnyMatrixTex M={view.value.Qhat} />
                <AnyMatrixTex M={view.value.Rhat} />
              </>
            )}
          </div>
          {qrForm === 'full' && <p className="caption">{view.value.dropped.reason}</p>}
          <section>
            <h3>Columns × rows: A = Σ qₖrₖ*</h3>
            <div className="heatmap-row">
              {view.value.layers.map((l) => (
                <div key={l.k} className={l.zero ? 'layer' : 'layer kept'}>
                  <MatrixHeatmap entries={l.matrix} maxAbs={view.value.maxAbs} caption={`q${l.k + 1}r${l.k + 1}*${l.zero ? ' = 0' : ''}`} />
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3>Orthonormal bases from Q</h3>
            <p>
              C(A):{' '}
              {view.value.bases.columnSpace.map((q, i) => (
                <Tex key={i} tex={`q_${i + 1} = (${anyVectorEntries(q, 4).join(', ')})`} />
              ))}
            </p>
            <p>
              N(Aᵀ):{' '}
              {view.value.bases.leftNullSpace.map((q, i) => (
                <Tex key={i} tex={`(${anyVectorEntries(q, 4).join(', ')})`} />
              ))}
            </p>
            <CheckList checks={view.value.bases.checks} />
            <p>
              <button type="button" className="link-button" onClick={() => attempt(() => openInLesson1(view.value.A, view.value.b, 'subspaces'))}>
                Four subspaces in Lesson 1
              </button>{' '}
              ·{' '}
              <button type="button" className="link-button" onClick={openSvd}>
                Orthonormal bases from the SVD (big picture)
              </button>
            </p>
          </section>
        </>
      )}
    </ModuleLayout>
  );
}
