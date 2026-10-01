import { useState } from 'react';
import { Caption } from '../../../components/display/Caption';
import { MatrixTex, matrixToTex } from '../../../components/display/MatrixTex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { Tex } from '../../../components/display/Tex';
import { VectorEditor } from '../../../components/editor/VectorEditor';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { attempt } from '../../../store/useSystem';
import { useStore } from '../../../store/useStore';
import { vector } from '../../../core/matrix';
import { crView, productsView } from '../models';
import { useViewModel } from '../useLessonSystem';
import { Controls } from './Controls';

/** §5.6: inner/outer product builder and CR factorization. */
export function ProductsView() {
  const { uCells, vCells, setUCell, setVCell } = useStore();
  const [selected, setSelected] = useState<number | null>(null);
  const products = attempt(() => productsView(vector(uCells), vector(vCells)));
  const cr = useViewModel((A) => crView(A, selected), [selected]);

  return (
    <ModuleLayout
      controls={
        <Controls showB={false} onColumnClick={setSelected}>
          <Caption section="§1.3">
            A = CR: C holds the independent columns, R holds the instructions for rebuilding every column.
          </Caption>
          <h3>Inner and outer product</h3>
          <VectorEditor label="u" values={uCells} onChange={setUCell} />
          <VectorEditor label="v" values={vCells} onChange={setVCell} />
        </Controls>
      }
    >
      <section>
        <h3>uᵀv and uvᵀ</h3>
        {products.ok ? (
          <>
            <Tex tex={products.value.innerTex} display />
            <Tex tex={products.value.innerShapeTex} />
            <MatrixTex entries={products.value.outer.map((r) => r.map((x) => x.toTex()))} />
            <Tex tex={products.value.outerShapeTex} />
            <p>rank(uvᵀ) = {products.value.outerRank}</p>
            <p>
              Every column is a multiple of u: column j = v<sub>j</sub>·u with v<sub>j</sub> ={' '}
              {products.value.columnMultiples.map(String).join(', ')}. Every row is a multiple of vᵀ: row i = u<sub>i</sub>·vᵀ
              with u<sub>i</sub> = {products.value.rowMultiples.map(String).join(', ')}.
            </p>
            <p>The rank-1 case of CR: C = u spans C(uvᵀ), R = vᵀ spans the row space.</p>
            <Tex
              tex={`${matrixToTex(products.value.outer.map((r) => r.map((x) => x.toTex())), false, {})} = ${matrixToTex(
                products.value.outerCR.C.map((r) => r.map((x) => x.toTex())),
                false,
                {},
              )}${matrixToTex(products.value.outerCR.R.map((r) => r.map((x) => x.toTex())), false, {})}`}
              display
            />
          </>
        ) : (
          <ViewNotice error={products.error} />
        )}
      </section>
      <section>
        <h3>CR factorization</h3>
        {cr.ok ? (
          <>
            <Tex tex={cr.value.tex} display />
            {cr.value.recipeTex && <Tex tex={cr.value.recipeTex} display />}
            {cr.value.columnProductTex && <Tex tex={cr.value.columnProductTex} display />}
            <Tex tex={cr.value.rankArgumentTex} display />
          </>
        ) : (
          <ViewNotice error={cr.error} />
        )}
      </section>
    </ModuleLayout>
  );
}
