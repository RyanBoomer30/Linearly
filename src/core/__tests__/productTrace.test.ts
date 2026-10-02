import { describe, expect, it } from 'vitest';
import { matrix, matrixToStrings } from '../matrix';
import { multiplyTrace, outerLayers, shapeMismatch } from '../productTrace';
import { A3, CR_PRODUCT, expectRealThrow, s } from './fixtures';

const B = matrix(CR_PRODUCT.B);
const C = matrix(CR_PRODUCT.C);

describe('shapeMismatch (L3-MM1)', () => {
  it('matching inner sizes', () => {
    expect(shapeMismatch(B, C)).toBeNull();
  });

  it('names both shapes when the inner sizes differ', () => {
    expect(shapeMismatch(B, B)).toMatch(/3 ?× ?2.*3 ?× ?2/);
  });
});

describe('multiplyTrace (F-M16)', () => {
  it('rows × columns: one step per entry, starting from zero', () => {
    const { result, trace } = multiplyTrace(B, C, 'rowsByColumns');
    expect(matrixToStrings(result)).toEqual(s(A3));
    expect(trace.steps).toHaveLength(1 + 3 * 3);
    expect(trace.steps[0].op).toBeNull();
    expect(matrixToStrings(trace.steps[0].matrix)).toEqual(s([[0, 0, 0], [0, 0, 0], [0, 0, 0]]));
  });

  it('rows × columns: entry (3, 3) = (3, −2)·(1, 1) = 1', () => {
    const { trace } = multiplyTrace(B, C, 'rowsByColumns');
    const step = trace.steps.find((st) => st.op?.kind === 'entry' && st.op.i === 2 && st.op.j === 2)!;
    expect(step.op?.kind).toBe('entry');
    if (step.op?.kind !== 'entry') return;
    expect(step.op.terms.map(([a, b]) => [a.toString(), b.toString()])).toEqual([
      ['3', '1'],
      ['-2', '1'],
    ]);
    expect(step.op.value.toString()).toBe('1');
  });

  it('rows × columns: entries are filled row by row', () => {
    const { trace } = multiplyTrace(B, C, 'rowsByColumns');
    const order = trace.steps.slice(1).map((st) => (st.op?.kind === 'entry' ? [st.op.i, st.op.j] : null));
    expect(order.slice(0, 4)).toEqual([[0, 0], [0, 1], [0, 2], [1, 0]]);
  });

  it('columns × rows: one outer product per k, the running sum ends at A (notes §3.1)', () => {
    const { result, trace } = multiplyTrace(B, C, 'columnsByRows');
    expect(trace.steps).toHaveLength(1 + 2);
    const [, first, second] = trace.steps;
    expect(first.op?.kind === 'outer' && matrixToStrings(first.op.layer)).toEqual(s([[1, 0, 1], [2, 0, 2], [3, 0, 3]]));
    expect(matrixToStrings(first.matrix)).toEqual(s([[1, 0, 1], [2, 0, 2], [3, 0, 3]]));
    expect(second.op?.kind === 'outer' && matrixToStrings(second.op.layer)).toEqual(s([[0, 0, 0], [0, 1, 1], [0, -2, -2]]));
    expect(matrixToStrings(second.matrix)).toEqual(s(A3));
    expect(matrixToStrings(result)).toEqual(s(A3));
  });

  it('every step has words and notation', () => {
    for (const mode of ['rowsByColumns', 'columnsByRows'] as const) {
      for (const st of multiplyTrace(B, C, mode).trace.steps.slice(1)) {
        expect(st.description.length).toBeGreaterThan(0);
        expect(st.tex.length).toBeGreaterThan(0);
      }
    }
  });

  it('throws a RangeError when the inner sizes differ', () => {
    expectRealThrow(() => multiplyTrace(B, B, 'rowsByColumns'));
    expect(() => multiplyTrace(B, B, 'rowsByColumns')).toThrow(RangeError);
  });
});

describe('outerLayers', () => {
  it('b_k c_k* for k = 1 … p', () => {
    expect(outerLayers(B, C).map(matrixToStrings)).toEqual([s([[1, 0, 1], [2, 0, 2], [3, 0, 3]]), s([[0, 0, 0], [0, 1, 1], [0, -2, -2]])]);
  });
});
