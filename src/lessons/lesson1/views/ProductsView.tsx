import { Caption } from '../../../components/display/Caption';
import { matrixToTex } from '../../../components/display/MatrixTex';
import { ViewNotice } from '../../../components/display/ViewNotice';
import { Tex } from '../../../components/display/Tex';
import { VectorEditor } from '../../../components/editor/VectorEditor';
import { ModuleLayout } from '../../../components/layout/ModuleLayout';
import { vector } from '../../../core/matrix';
import { attempt } from '../../../store/useSystem';
import { useStore } from '../../../store/useStore';
import { productsView } from '../models';

/** §5.6: inner and outer products of two vectors u and v. */
export function ProductsView() {
  const { uCells, vCells, setUCell, setVCell, setView } = useStore();
  const products = attempt(() => productsView(vector(uCells), vector(vCells)));
  const entries = (M: { toTex(): string }[][]) => M.map((r) => r.map((x) => x.toTex()));

  return (
    <ModuleLayout
      controls={
        <>
          <Caption section="§1.3">
            Vectors are matrices too. Row times column gives a number (inner product); column times row gives a matrix (outer
            product).
          </Caption>
          <VectorEditor label="u" values={uCells} onChange={setUCell} />
          <VectorEditor label="v" values={vCells} onChange={setVCell} />
        </>
      }
    >
      {products.ok ? (
        <>
          <section>
            <h3>Inner product uᵀv — row times column</h3>
            <Tex tex={products.value.innerTex} display />
            <Tex tex={products.value.innerShapeTex} display />
          </section>
          <section>
            <h3>Outer product uvᵀ — column times row</h3>
            <Tex
              tex={`uv^{T} = ${matrixToTex(
                uCells.map((x) => [x]),
                false,
                {},
              )}${matrixToTex([vCells], false, {})} = ${matrixToTex(entries(products.value.outer), false, {})}`}
              display
            />
            <Tex tex={products.value.outerShapeTex} display />
            <p>
              rank(uvᵀ) = {products.value.outerRank}. Every column is a multiple of u: column j = v<sub>j</sub>·u with v
              <sub>j</sub> = {products.value.columnMultiples.map(String).join(', ')}. Every row is a multiple of vᵀ: row i = u
              <sub>i</sub>·vᵀ with u<sub>i</sub> = {products.value.rowMultiples.map(String).join(', ')}.
            </p>
            <p>
              So uvᵀ is already factored: C = u holds its one independent column and R = vᵀ its one independent row. That is
              the rank-1 case of the{' '}
              <button type="button" className="link-button" onClick={() => setView('cr')}>
                CR factorization
              </button>
              , which works for any matrix.
            </p>
          </section>
        </>
      ) : (
        <ViewNotice error={products.error} />
      )}
    </ModuleLayout>
  );
}
