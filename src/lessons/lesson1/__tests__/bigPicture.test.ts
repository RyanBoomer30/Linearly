import { beforeAll, describe, expect, it } from 'vitest';
import { matrix, vector, vectorToStrings } from '../../../core/matrix';
import { bigPictureModel, subspaceInfo, type BigPictureModel } from '../models';

const A3 = [
  [1, 0, 1],
  [2, 1, 3],
  [3, -2, 1],
];

describe('bigPictureModel', () => {
  let model: BigPictureModel;
  beforeAll(() => {
    model = bigPictureModel(matrix(A3), vector([2, 1, 0]), vector([2, 5, 5]));
  });

  it('dimensions', () => {
    expect([model.m, model.n, model.rank]).toEqual([3, 3, 2]);
  });

  it('A side: x = x_r + x_n and b = Ax', () => {
    expect(vectorToStrings(model.xr)).toEqual(['1', '0', '1']);
    expect(vectorToStrings(model.xn)).toEqual(['1', '1', '-1']);
    expect(vectorToStrings(model.b)).toEqual(['2', '5', '4']);
  });

  it('Aᵀ side: t = p + e and Aᵀe = 0', () => {
    expect(model.target).not.toBeNull();
    expect(vectorToStrings(model.target!.e)).toEqual(['-7/54', '1/27', '1/54']);
  });

  it('exact checks are all zero', () => {
    expect(model.checks.xrDotXn.isZero()).toBe(true);
    expect(vectorToStrings(model.checks.Axn)).toEqual(['0', '0', '0']);
    expect(vectorToStrings(model.checks.Axr)).toEqual(['2', '5', '4']);
    expect(model.checks.pDotE?.isZero()).toBe(true);
    expect(vectorToStrings(model.checks.Ate!)).toEqual(['0', '0', '0']);
  });

  it('labels carry exact values', () => {
    expect(model.labels.xr).toBe('xᵣ = (1, 0, 1)');
    expect(model.labels.e).toBe('e = (−7/54, 1/27, 1/54)');
  });

  it('scene spans match subspace dimensions', () => {
    expect(model.scene.rowSpan).toHaveLength(2);
    expect(model.scene.nullSpan).toHaveLength(1);
    expect(model.scene.columnSpan).toHaveLength(2);
    expect(model.scene.leftNullSpan).toHaveLength(1);
  });

  it('target is optional', () => {
    expect(bigPictureModel(matrix(A3), vector([2, 1, 0]), null).target).toBeNull();
  });
});

describe('subspaceInfo', () => {
  it('describes each subspace and its orthogonal complement', () => {
    const model = bigPictureModel(matrix(A3), vector([2, 1, 0]), null);
    const row = subspaceInfo(model, 'row');
    expect(row.title).toBe('Row space C(Aᵀ)');
    expect(row.ambient).toBe('ℝ³');
    expect(row.dim).toBe(2);
    expect(row.complement).toBe('null');
    expect(subspaceInfo(model, 'leftNull').dim).toBe(1);
    expect(subspaceInfo(model, 'column').complement).toBe('leftNull');
  });
});
