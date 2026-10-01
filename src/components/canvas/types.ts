/** Rendering works in floats; convert from the exact core with toFloatVector. */
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

/** Lift a 2D or 3D float vector into scene coordinates (z = 0 for 2D). */
export const toVec3 = (v: readonly number[]): Vec3 => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
