import type { Matrix, Vector } from './matrix';
import { notImplemented } from './notImplemented';
import type { Rational } from './rational';

export interface SubstitutionStep {
  /** 0-based unknown solved in this step. */
  index: number;
  value: Rational;
  /** Row of the triangular matrix in use (L3-S1). */
  row: number;
  /** "c_2 = b_2 - l_{21}c_1 = 5 - 2·2 = 1" */
  tex: string;
  description: string;
}

export interface SubstitutionResult {
  /** null when back substitution stopped at a zero pivot. */
  solution: Vector | null;
  steps: SubstitutionStep[];
  stopped: { index: number; reason: string } | null;
}

/** F-M18: solve Lc = b top to bottom. L is lower triangular (unit diagonal not required). */
export function forwardSub(L: Matrix, b: Vector): SubstitutionResult {
  return notImplemented('forwardSub');
}

/** F-M18: solve Ux = c bottom to top; stops with a reason at a zero pivot. */
export function backSub(U: Matrix, c: Vector): SubstitutionResult {
  return notImplemented('backSub');
}
