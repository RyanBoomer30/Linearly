/** Section 9 test fixtures (Lesson 1 notes), as plain numbers. */
export const SYSTEM_2x2 = {
  A: [
    [1, 1],
    [2, -1],
  ],
  b: [5, 1],
};

export const A3 = [
  [1, 0, 1],
  [2, 1, 3],
  [3, -2, 1],
];

export const B_CONSISTENT = [2, 5, 4];
export const B_INCONSISTENT = [2, 5, 5];

export const OUTER = { u: [1, 1, 1], v: [1, 2, 3] };

/** Numbers → the string form produced by matrixToStrings / vectorToStrings. */
export const s = (rows: (number | string)[][]) => rows.map((r) => r.map(String));
export const sv = (v: (number | string)[]) => v.map(String);

/** Asserts fn throws a real error — not the skeleton's "Not implemented" placeholder. */
export function expectRealThrow(fn: () => unknown) {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  if (!error) throw new Error('expected function to throw');
  if (error instanceof Error && error.message.startsWith('Not implemented')) throw error;
}

/** Strang, "The Four Fundamental Subspaces: 4 Lines", §2 — 3×4, rank 2, already in rref. */
export const STRANG_3x4 = [
  [1, 0, 2, 3],
  [0, 1, 4, 5],
  [0, 0, 0, 0],
];

/** Strang §3 — rank one A = xyᵀ with x = (1,2), y = (1,1): four lines in ℝ². */
export const RANK1_2x2 = [
  [1, 1],
  [2, 2],
];
