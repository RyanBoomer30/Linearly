import { useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import type { Swap } from '../../../core/permutation';
import { useLesson3Store } from '../../../store/useLesson3Store';
import { attempt } from '../../../store/useSystem';
import { MULTIPLIER_COLOR } from '../../../theme/colors';
import { compositionView, paluView, permutationBuilder, permutationGallery, tinyPivotDemo } from '../models';
import { useLesson3 } from '../useLesson3';
import { Controls } from './Controls';
import { subscript, texEntries } from './format';

const fmt = (v: number[]) => `(${v.map((x) => +x.toPrecision(6)).join(', ')})`;

/** §7.7 */
export function PermutationsView() {
  const pivoting = useLesson3Store((s) => s.pivoting);
  const palu = useLesson3((s) => paluView(s.A, s.rhs[0], pivoting), [pivoting]);
  const demo = attempt(() => tinyPivotDemo());

  return (
    <ModuleLayout
      controls={
        <Controls>
          <Caption section="§3.4">
            When a pivot is 0 (or small), exchange rows. A permutation matrix P records the exchanges, and PA = LU.
          </Caption>
        </Controls>
      }
    >
      <PermutationBuilder />
      <Gallery />
      <Composition />
      <section>
        <h3>PA = LU</h3>
        {!palu.ok && <ViewNotice error={palu.error} />}
        {palu.ok && (
          <>
            <ol className="checks">
              {palu.value.swapsText.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <div className="lu-panels">
              {(['P', 'L', 'U'] as const).map((name) => (
                <figure key={name}>
                  <figcaption>{name}</figcaption>
                  <MatrixTex
                    entries={texEntries(palu.value.lu[name])}
                    highlights={
                      name === 'L'
                        ? { entryColors: Object.fromEntries(palu.value.lu.L.flatMap((r, i) => r.flatMap((_, j) => (j < i ? [[`${i},${j}`, MULTIPLIER_COLOR]] : [])))) }
                        : {}
                    }
                  />
                </figure>
              ))}
            </div>
            <p className={palu.value.check.equal ? 'hit' : 'solution-msg warn'}>
              <Tex tex={palu.value.check.tex} />
            </p>
            {palu.value.solve?.x && (
              <p>
                Solving Lc = Pb and Ux = c gives <Tex tex={`x = (${palu.value.solve.x.map((v) => v.toTex()).join(', ')})`} />.
              </p>
            )}
          </>
        )}
      </section>
      <section>
        <h3>Why the largest pivot? (floating point)</h3>
        {demo.ok ? (
          <>
            <Tex tex={`\\begin{bmatrix} 10^{-20} & 1 \\\\ 1 & 1 \\end{bmatrix} x = \\begin{bmatrix} 1 \\\\ 2 \\end{bmatrix}`} display />
            <p>
              Without pivoting: x = {fmt(demo.value.withoutPivoting)}. With partial pivoting: x = {fmt(demo.value.withPivoting)}.
            </p>
            <p className="caption">{demo.value.note}</p>
          </>
        ) : (
          <ViewNotice error={demo.error} />
        )}
      </section>
    </ModuleLayout>
  );
}

/** L3-PM1: click two rows to swap them; P and a sample matrix update. */
function PermutationBuilder() {
  const [n, setN] = useState(3);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const view = attempt(() => permutationBuilder(n, swaps));
  const pick = (row: number) => {
    if (picked === null) return setPicked(row);
    if (picked !== row) setSwaps([...swaps, [picked, row]]);
    setPicked(null);
  };
  return (
    <section>
      <h3>Build a permutation</h3>
      <div className="editor-buttons">
        <label className="preset-picker">
          n{' '}
          <select
            value={n}
            onChange={(e) => {
              setN(Number(e.target.value));
              setSwaps([]);
            }}
          >
            {[2, 3, 4].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        {Array.from({ length: n }, (_, i) => (
          <button key={i} type="button" className={picked === i ? 'active' : undefined} onClick={() => pick(i)}>
            row {i + 1}
          </button>
        ))}
        <button type="button" onClick={() => setSwaps([])} disabled={swaps.length === 0}>
          Reset to I
        </button>
      </div>
      <p className="caption">{picked === null ? 'Click two rows to swap them.' : `Row ${picked + 1} picked; click another row.`}</p>
      {view.ok ? (
        <div className="matrix-pair">
          <Tex tex="P =" />
          <MatrixTex entries={texEntries(view.value.P)} />
          <Tex tex="\quad P \cdot" />
          <MatrixTex entries={texEntries(view.value.sample)} />
          <Tex tex="=" />
          <MatrixTex entries={texEntries(view.value.permuted)} />
        </div>
      ) : (
        <ViewNotice error={view.error} />
      )}
      {/* TODO(L3-PM1, F-D9): animate the sample's rows into their new places using view.destinations. */}
    </section>
  );
}

/** L3-PM2 */
function Gallery() {
  const [n, setN] = useState(3);
  const gallery = attempt(() => permutationGallery(n));
  return (
    <section>
      <h3>
        Every permutation matrix for n ={' '}
        <select value={n} onChange={(e) => setN(Number(e.target.value))}>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </h3>
      {gallery.ok ? (
        <>
          <div className="gallery">
            {gallery.value.matrices.map((P, k) => (
              <MatrixTex key={k} entries={texEntries(P)} />
            ))}
          </div>
          <p>{gallery.value.counts.map((c) => `n = ${c.n}: ${c.count}`).join(' · ')} (n! of them)</p>
        </>
      ) : (
        <ViewNotice error={gallery.error} />
      )}
    </section>
  );
}

/** L3-PM3: P = P₂P₁. */
function Composition() {
  const [first, setFirst] = useState<Swap>([0, 1]);
  const [second, setSecond] = useState<Swap>([1, 2]);
  const view = attempt(() => compositionView(3, first, second));
  const pairs: Swap[] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  const picker = (value: Swap, onChange: (s: Swap) => void, label: string) => (
    <label className="preset-picker">
      {label}{' '}
      <select value={value.join(',')} onChange={(e) => onChange(e.target.value.split(',').map(Number) as Swap)}>
        {pairs.map((p) => (
          <option key={p.join(',')} value={p.join(',')}>
            swap rows {p[0] + 1} and {p[1] + 1}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section>
      <h3>Two exchanges in a row</h3>
      <div className="editor-buttons">
        {picker(first, setFirst, `P${subscript(1)} (first)`)}
        {picker(second, setSecond, `P${subscript(2)} (second)`)}
      </div>
      {view.ok ? (
        <>
          <div className="matrix-pair">
            <Tex tex="P = P_2P_1 =" />
            <MatrixTex entries={texEntries(view.value.P2)} />
            <MatrixTex entries={texEntries(view.value.P1)} />
            <Tex tex="=" />
            <MatrixTex entries={texEntries(view.value.P)} />
          </div>
          <p className="caption">{view.value.orderNote}</p>
          <p className={view.value.check.equal ? 'hit' : 'solution-msg warn'}>
            <Tex tex={view.value.check.tex} />
          </p>
        </>
      ) : (
        <ViewNotice error={view.error} />
      )}
    </section>
  );
}
