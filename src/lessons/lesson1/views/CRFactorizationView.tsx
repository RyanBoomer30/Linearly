import { useState } from 'react';
import { Canvas2D } from '../../../components/canvas/Canvas2D';
import { Canvas3D } from '../../../components/canvas/Canvas3D';
import { Caption } from '../../../components/display/Caption';
import { matrixToTex } from '../../../components/display/MatrixTex';
import { Tex } from '../../../components/display/Tex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import type { Matrix } from '../../../core/matrix';
import { useStore } from '../../../store/useStore';
import { columnColor } from '../../../theme/colors';
import { useSceneColors } from '../../../theme/useTheme';
import { crColumnScene, crExplainer, crView } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';
import { ColumnPictureContents, columnPictureFit } from './SceneContents';

const HIGHLIGHT = '#fef08a';
const sub = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);

/** Matrix TeX with one column or one row highlighted (dark text on the highlight so it reads in both themes). */
function highlighted(M: Matrix, opts: { column?: number | null; row?: number | null; columnColors?: (string | undefined)[] }) {
  const entries = M.map((r, i) =>
    r.map((x, j) => (opts.column === j || opts.row === i ? `\\textcolor{#000000}{${x.toTex()}}` : x.toTex())),
  );
  const cells: Record<string, string> = {};
  M.forEach((r, i) =>
    r.forEach((_, j) => {
      if (opts.column === j || opts.row === i) cells[`${i},${j}`] = HIGHLIGHT;
    }),
  );
  return matrixToTex(entries, false, { entryBackgrounds: cells, columnColors: opts.columnColors });
}

/**
 * §5.9: CR factorization. C is the independent columns of A; R is the recipe
 * that rebuilds every column of A from them. Walks through why, step by step.
 */
export function CRFactorizationView() {
  const colors = useSceneColors();
  const setView = useStore((s) => s.setView);
  const [column, setColumn] = useState<number | null>(null);
  const [row, setRow] = useState<number | null>(null);
  const ex = useViewModel((A) => crExplainer(A));
  const selected = useViewModel((A) => (column === null ? null : crView(A, column)), [column]);
  const scene = useViewModel((A) => (column === null ? null : crColumnScene(A, column)), [column]);
  const A = useViewModel((M) => M);

  if (!ex.ok || !A.ok) {
    return (
      <ModuleLayout controls={<Controls showB={false} />}>
        <ViewNotice error={!ex.ok ? ex.error : !A.ok ? A.error : ''} />
      </ModuleLayout>
    );
  }
  const e = ex.value;
  const { C, R, pivotCols } = e.cr;
  const pivotColors = pivotCols.map((p) => columnColor(p));
  const aColors = A.value[0].map((_, j) => (pivotCols.includes(j) ? columnColor(j) : undefined));
  const col = column !== null && column < e.n ? column : null;
  const rw = row !== null && row < e.m ? row : null;
  const SceneCanvas = e.m === 2 ? Canvas2D : Canvas3D;
  const canDraw = (e.m === 2 || e.m === 3) && e.rank > 0;
  // Step 4 quotes the matrix's own first dependent column, if it has one.
  const dependent = e.columns.find((c) => !c.independent && c.recipe.some((x) => !x.isZero()));

  const columnChips = (
    <div className="chips" role="group" aria-label="Pick a column of A">
      {Array.from({ length: e.n }, (_, j) => (
        <button
          key={j}
          type="button"
          className={col === j ? 'chip active' : 'chip'}
          style={{ borderColor: columnColor(j), color: col === j ? undefined : columnColor(j) }}
          aria-pressed={col === j}
          onClick={() => setColumn(col === j ? null : j)}
        >
          a{sub(j + 1)}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleLayout
      controls={
        <Controls showB={false} onColumnClick={(j) => setColumn(col === j ? null : j)}>
          <Caption section="§1.3">
            Any matrix factors as A = CR: C keeps the independent columns of A, and R is the recipe that rebuilds every
            column of A from them.
          </Caption>
          <p className="caption">Pick a column to follow its recipe:</p>
          {columnChips}
          <p className="caption">Pick a row to see it built from the rows of R:</p>
          <div className="chips" role="group" aria-label="Pick a row of A">
            {Array.from({ length: e.m }, (_, i) => (
              <button
                key={i}
                type="button"
                className={rw === i ? 'chip active' : 'chip'}
                aria-pressed={rw === i}
                onClick={() => setRow(rw === i ? null : i)}
              >
                row {i + 1}
              </button>
            ))}
          </div>
        </Controls>
      }
    >
      <div className="cr-steps">
        <section className="cr-step">
          <h3>1. A = C R at a glance</h3>
          <Tex tex={e.factorTex} display />
          <Tex tex={e.shapeTex} display />
          <p>
            A is {e.m}×{e.n} with rank r = {e.rank}. C is {e.m}×{e.rank}: the {e.rank} independent column
            {e.rank === 1 ? '' : 's'} of A, unchanged. R is {e.rank}×{e.n}: one column of instructions for each column of A.
            Multiplying them gives back A exactly{e.reproduces ? ' ✓' : ''}.
          </p>
        </section>

        <section className="cr-step">
          <h3>2. C: keep the columns that add a new direction</h3>
          <p>
            Go through the columns of A from left to right. A column that is <em>not</em> a combination of the columns kept
            so far adds a new direction, so it goes into C. A column that <em>is</em> such a combination adds nothing new, so it
            is left out — the span C(A) does not change.
          </p>
          <ul className="cr-verdicts">
            {e.columns.map((v) => (
              <li key={v.column} className={col === v.column ? 'selected' : undefined}>
                <button type="button" className="chip" style={{ borderColor: columnColor(v.column) }} onClick={() => setColumn(v.column)}>
                  a{sub(v.column + 1)}
                </button>
                <span className={v.independent ? 'verdict keep' : 'verdict skip'}>{v.independent ? 'joins C' : 'left out'}</span>
                <Tex tex={v.tex} />
                <span className="caption">{v.reason}</span>
              </li>
            ))}
          </ul>
          <p>
            The kept columns form a basis of C(A): dim C(A) = {e.rank}.{' '}
            <Tex tex={`C = ${matrixToTex(C.map((r) => r.map((x) => x.toTex())), false, { columnColors: pivotColors })}`} />
          </p>
        </section>

        <section className="cr-step">
          <h3>3. R: the recipe for every column</h3>
          <p>
            Column j of R lists the weights that rebuild column j of A from the columns of C:{' '}
            <Tex tex="a_j = R_{1j}\,c_1 + R_{2j}\,c_2 + \cdots" />. A column that is in C just picks itself, so the pivot
            columns of R form the identity.
          </p>
          {columnChips}
          <Tex
            tex={`${highlighted(A.value, { column: col, columnColors: aColors })} = ${matrixToTex(
              C.map((r) => r.map((x) => x.toTex())),
              false,
              { columnColors: pivotColors },
            )}\\,${highlighted(R, { column: col })}`}
            display
          />
          {col === null ? (
            <p className="caption">Pick a column above to follow its recipe.</p>
          ) : (
            selected.ok &&
            selected.value && (
              <div className="cr-recipe">
                <Tex tex={selected.value.recipeTex ?? ''} display />
                <Tex tex={selected.value.columnProductTex ?? ''} display />
                <p>{e.columns[col].reason}</p>
                {canDraw && scene.ok && scene.value && (
                  <figure>
                    <figcaption>
                      The columns of C, weighted by column {col + 1} of R, land exactly on a{sub(col + 1)}.
                    </figcaption>
                    <SceneCanvas fit={columnPictureFit(scene.value)}>
                      <ColumnPictureContents
                        scene={scene.value}
                        resultColor={colors.result}
                        targetColor={colors.target}
                        targetLabel={`a_${col + 1}`}
                      />
                    </SceneCanvas>
                  </figure>
                )}
              </div>
            )
          )}
        </section>

        <section className="cr-step">
          <h3>4. Where R comes from: rref(A) without its zero rows</h3>
          <p>
            Row operations change the rows of A but never the relationships between its columns:{' '}
            {dependent ? (
              <>
                since <Tex tex={dependent.tex} /> in A, the same combination holds in every matrix along the way.
              </>
            ) : (
              <>whatever combination of columns holds in A holds in every matrix along the way.</>
            )}{' '}
            So rref(A) shows the recipes in their simplest form. Its pivot columns
            are the columns of the identity, and each other column holds that column's weights. The zero rows carry no
            information, so they are dropped.
          </p>
          <Tex tex={`\\operatorname{rref}(A) = ${e.rrefTex} \\;\\longrightarrow\\; R = ${matrixToTex(R.map((r) => r.map((x) => x.toTex())), false, {})}`} display />
          <p className="caption">
            {e.zeroRows.length === 0
              ? 'No zero rows: every row of rref(A) has a pivot.'
              : `Dropped (grey): row${e.zeroRows.length === 1 ? '' : 's'} ${e.zeroRows.map((i) => i + 1).join(', ')}.`}{' '}
            <button type="button" className="link-button" onClick={() => setView('elimination')}>
              Watch the elimination steps
            </button>
          </p>
        </section>

        <section className="cr-step">
          <h3>5. Read it by rows: every row of A is a combination of the rows of R</h3>
          <p>
            A = CR also says that row i of A = Σ C<sub>ik</sub> · (row k of R). So the rows of R span the row space C(Aᵀ),
            and they are independent (each has a 1 where the others have 0), so they are a basis of it.
          </p>
          <Tex
            tex={`${highlighted(A.value, { row: rw })} = ${highlighted(C, { row: rw, columnColors: pivotColors })}\\,${matrixToTex(
              R.map((r) => r.map((x) => x.toTex())),
              false,
              {},
            )}`}
            display
          />
          <ul className="cr-rows">
            {e.rowRecipes.map((rr) => (
              <li key={rr.row} className={rw === rr.row ? 'selected' : undefined}>
                <span className="caption">row {rr.row + 1}:</span> <Tex tex={rr.tex} />
              </li>
            ))}
          </ul>
        </section>

        <section className="cr-step">
          <h3>6. Column rank = row rank</h3>
          <p>
            For the product CR to make sense, C must have as many columns as R has rows. C's columns are a basis of the
            column space and R's rows are a basis of the row space, so both spaces have the same dimension.
          </p>
          <Tex
            tex={`\\underbrace{${e.rank}}_{\\text{columns of }C} = \\underbrace{${e.rank}}_{\\text{rows of }R}\\;\\Rightarrow\\;\\dim C(A) = \\dim C(A^{T}) = r = ${e.rank}`}
            display
          />
        </section>

        <section className="cr-step">
          <h3>7. A as a sum of rank-1 pieces</h3>
          <p>
            Multiplying column by row, CR = c₁r₁ᵀ + c₂r₂ᵀ + ⋯: each independent column times its row of R is an outer
            product of rank 1 (see{' '}
            <button type="button" className="link-button" onClick={() => setView('products')}>
              Products
            </button>
            ), and A is their sum.
          </p>
          {e.rankOneTex.map((tex, k) => (
            <Tex key={k} tex={tex} display />
          ))}
          <Tex tex={e.rankOneSumTex} display />
        </section>

        <section className="cr-step">
          <h3>8. Why factor?</h3>
          <p>
            Storing A takes {e.m}×{e.n} = {e.storage.full} numbers; storing C and R takes {e.m}×{e.rank} + {e.rank}×{e.n} ={' '}
            {e.storage.factored}.{' '}
            {e.storage.factored < e.storage.full
              ? 'The factored form is smaller: the rank is low compared with the size.'
              : 'Here that saves nothing — the matrix is too small. For a large data matrix of low rank, the savings are huge.'}{' '}
            More importantly, the factors expose structure: C tells you which columns (features) carry new information, and R
            tells you exactly how the others depend on them. Later lessons factor A in other ways (LU, QR) to uncover other
            information.
          </p>
        </section>
      </div>
    </ModuleLayout>
  );
}

