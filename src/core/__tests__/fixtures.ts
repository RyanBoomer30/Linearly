import { q } from '../rational';
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

/** Section 10.2 test fixtures (Lesson 2 notes). Decimals as strings so they parse exactly. */
export const HOUSES = { x: ['1', '2.25', '1.5'], y: [4, 6, 5] };

export const QUADRATIC = { x: [-1, 0, 1, 2], y: [1, 0, 0, 2] };

/** Illustrative 2-feature set: living area, bedrooms → price. */
export const TWO_FEATURES = {
  area: ['1', '2.25', '1.5', '1.75', '2.5'],
  bedrooms: [2, 4, 3, 3, 4],
  price: [4, 6, 5, '5.5', '6.5'],
};

/** Notes §2.4 figure (illustrative values): curved data that a line underfits. Same as the 'curved' preset. */
export const CURVED = {
  x: ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'],
  y: ['1', '2.5', '3.2', '3', '2.1', '1.6', '1.8', '3', '4.8', '6', '6.3'],
};

/** The notes' rounded parameters (§2.2): θ* = 3 and θ* = (2.5, 1.58). */
export const NOTES_ROUNDED = { origin: ['3'], line: ['2.5', '1.58'] };

/** All three x equal: X has dependent columns. */
export const DEPENDENT = { x: [1, 1, 1], y: [4, 6, 5] };

// Section 11.3 test fixtures (Lesson 3 notes) ------------------------------------

/** Lesson 1's A = CR, as the product of §3.1. */
export const CR_PRODUCT = {
  B: [
    [1, 0],
    [2, 1],
    [3, -2],
  ],
  C: [
    [1, 0, 1],
    [0, 1, 1],
  ],
};

/** Notes §3.2: the LU example. */
export const LU_A = [
  [1, 2, 2],
  [2, 6, 5],
  [-1, 8, 7],
];
export const LU_L = [
  [1, 0, 0],
  [2, 1, 0],
  [-1, 5, 1],
];
export const LU_U = [
  [1, 2, 2],
  [0, 2, 1],
  [0, 0, 4],
];
export const LU_B = [2, 5, -1];

/** Notes §3.4: PA = LU with two row exchanges. */
export const PALU_A = [
  [1, 2, 2],
  [2, 4, 2],
  [-1, 1, 0],
];
export const PALU_P = [
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 0],
];
export const PALU_L = [
  [1, 0, 0],
  ['-1/2', 1, 0],
  ['1/2', 0, 1],
];
export const PALU_U = [
  [2, 4, 2],
  [0, 3, 1],
  [0, 0, 1],
];

/** Lesson 2 houses, line model: XᵀX and XᵀY for three years (years 2 and 3 illustrative). */
export const HOUSES_XTX = [
  [3, '19/4'],
  ['19/4', '133/16'],
];
export const HOUSES_XTY = [
  [15, 25],
  ['16.3', '27.125'],
  [17, '28.5'],
];

// Section 12.4 test fixtures (Lesson 4 notes) ------------------------------------

/** Notes §4.1: the reflector example. */
export const REFLECTOR = { x: [2, 2, 1], w: [3, 0, 0] };
export const REFLECTOR_P6 = [
  [1, -2, -1],
  [-2, 4, 2],
  [-1, 2, 1],
];
/** 3H, also 3Ĥ₂ in §4.3. */
export const REFLECTOR_H3 = [
  [2, 2, 1],
  [2, -1, -2],
  [1, -2, 2],
];

/** Notes §4.3–4.4: the 4 × 2 QR and least-squares example. */
export const QR_A = [
  [1, 4],
  [1, 1],
  [1, 1],
  [1, 0],
];
export const QR_B = [3, -1, 1, 3];
/** 2H₁ */
export const QR_H1_2 = [
  [1, 1, 1, 1],
  [1, 1, -1, -1],
  [1, -1, 1, -1],
  [1, -1, -1, 1],
];
export const QR_H1A = [
  [2, 3],
  [0, 2],
  [0, 2],
  [0, 1],
];
export const QR_R = [
  [2, 3],
  [0, 3],
  [0, 0],
  [0, 0],
];
/** 6Q */
export const QR_Q6 = [
  [3, 5, -1, 1],
  [3, -1, 5, 1],
  [3, -1, -1, -5],
  [3, -3, -3, 3],
];

/** Scale every entry of an integer matrix by 1/d, as strings. */
export const over = (M: number[][], d: number) => M.map((r) => r.map((x) => q(x, d).toString()));

// Section 13.5 test fixtures (Lesson 5 notes) ------------------------------------

/** Notes §5.1: the mini web. Decimals as strings so they parse exactly. Rows "to", columns "from". */
export const MINI_WEB = [
  ['0.7', '0.1', '0.2'],
  ['0.2', '0.4', '0.2'],
  ['0.1', '0.5', '0.6'],
];
export const MINI_WEB_X0 = [1, 0, 0];

/** Notes §5.3: V (columns v₁, v₂, v₃ for λ = 1, 1/2, 1/5) and 60V⁻¹. */
export const MINI_WEB_V = [
  [7, 1, -1],
  [5, 0, -3],
  [8, -1, 4],
];
export const MINI_WEB_VINV_60 = [
  [3, 3, 3],
  [44, -36, -16],
  [5, -15, 5],
];

/** Notes §5.3 corrected (L5-RK5): 20 × the λ = 1 layer, and 60 × the 0.5ᵗ and 0.2ᵗ layers. */
export const MINI_WEB_LAYERS = {
  one20: [
    [7, 7, 7],
    [5, 5, 5],
    [8, 8, 8],
  ],
  half60: [
    [44, -36, -16],
    [0, 0, 0],
    [-44, 36, 16],
  ],
  fifth60: [
    [-5, 15, -5],
    [-15, 45, -15],
    [20, -60, 20],
  ],
};

/** Notes §5.2: the 40-state sequence, exactly as printed (with its space). */
export const NOTES_SEQUENCE = '311213223112123122331313 3122321213223221';
/** The homework answer: P̂ (rows "to", columns "from"). */
export const NOTES_P_HAT = [
  ['1/6', '1/3', '1/2'],
  ['1/2', '1/3', '1/3'],
  ['1/3', '1/3', '1/6'],
];

/** Perron–Frobenius counterexamples (L5-PF5). */
export const FLIP = [
  [0, 1],
  [1, 0],
];
export const CYCLE = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
];
export const ABSORBING = [
  ['1', '0', '0.5'],
  ['0', '1', '0.5'],
  ['0', '0', '0'],
];

/** Each column's sign flipped so its first nonzero entry is positive: compares eigenvector matrices up to column signs. */
export const columnSigns = (M: string[][]) => {
  const cols = M[0].map((_, j) => M.map((r) => r[j]));
  const fixed = cols.map((c) => {
    const first = c.find((x) => x !== '0');
    return first?.startsWith('-') ? c.map((x) => (x === '0' ? x : x.startsWith('-') ? x.slice(1) : `-${x}`)) : c;
  });
  return M.map((_, i) => fixed.map((c) => c[i]));
};
/** columnSigns for rows. */
export const rowSigns = (M: string[][]) => {
  const t = (X: string[][]) => X[0].map((_, j) => X.map((r) => r[j]));
  return t(columnSigns(t(M)));
};

// Section 14.6 test fixtures (Lesson 6 notes) ------------------------------------

/** Notes §6.1: 3 × 4 grid, wall at (1, 1), +1 at state 4, −1 at state 7, robot at state 10. Cells are [row, col]. */
export const NOTES_GRID = {
  rows: 3,
  cols: 4,
  walls: [[1, 1]] as [number, number][],
  rewards: [
    { cell: [0, 3] as [number, number], reward: 1 },
    { cell: [1, 3] as [number, number], reward: -1 },
  ],
  terminals: [
    [0, 3],
    [1, 3],
  ] as [number, number][],
  start: [2, 2] as [number, number],
};

/** A 1 × 3 corridor with +1 at the right end (terminal), robot at the left. */
export const CORRIDOR = {
  rows: 1,
  cols: 3,
  walls: [] as [number, number][],
  rewards: [{ cell: [0, 2] as [number, number], reward: 1 }],
  terminals: [[0, 2]] as [number, number][],
  start: [0, 0] as [number, number],
};

/** A grid fixture as a GridSpec, with slip q and an optional living reward. */
export const gridSpec = (g: typeof NOTES_GRID | typeof CORRIDOR, slip: string | number = '1/10', livingReward?: string | number) => ({
  rows: g.rows,
  cols: g.cols,
  walls: g.walls,
  rewards: g.rewards.map((r) => ({ cell: r.cell, reward: q(r.reward) })),
  terminals: g.terminals,
  start: g.start,
  slip: q(slip),
  ...(livingReward === undefined ? {} : { livingReward: q(livingReward) }),
});

/** 0-based state index of a notes state number. */
export const st = (label: number) => label - 1;

/** The notes' route: π* for q = 1/10, γ = 9/10, by state number (terminals 4 and 7 omitted). */
export const NOTES_PI_STAR: Record<number, 'up' | 'right' | 'down' | 'left'> = {
  1: 'right',
  2: 'right',
  3: 'right',
  5: 'up',
  6: 'up',
  8: 'up',
  9: 'left',
  10: 'up',
  11: 'left',
};

// Section 15.7 test fixtures (Lesson 7 notes) ------------------------------------

/** Notes §7.0: the 2 × 3 SVD example; σ = √3, 1. */
export const SVD_EXAMPLE = [
  [0, 1, 1],
  [1, 1, 0],
];
/** 2 × the exact layers σ₁u₁v₁ᵀ and σ₂u₂v₂ᵀ. */
export const SVD_EXAMPLE_LAYERS_2 = [
  [
    [1, 2, 1],
    [1, 2, 1],
  ],
  [
    [-1, 0, 1],
    [1, 0, -1],
  ],
];

/** Notes §7.1: centered age x₁ and height x₂ for six people. */
export const AGE_HEIGHT = [
  [3, 7],
  [-4, -6],
  [7, 8],
  [1, -1],
  [-4, -1],
  [-3, -7],
];
/** Illustrative weights (not in the notes), for the regression on components (L7-D4). */
export const WEIGHTS = [70, 48, 80, 58, 52, 44];
/** v₁ and v₂ to the notes' 4 digits, after the sign setting. */
export const NOTES_V1 = [0.5606, 0.8281];
export const NOTES_V2 = [0.8281, -0.5606];
