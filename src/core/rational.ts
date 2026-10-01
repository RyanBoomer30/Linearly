import { notImplemented } from './notImplemented';

/**
 * Exact rational number (F-M1). Always stored in lowest terms with a positive
 * denominator, so structural equality matches numeric equality.
 */
export class Rational {
  readonly num: bigint;
  readonly den: bigint;

  private constructor(num: bigint, den: bigint) {
    this.num = num;
    this.den = den;
  }

  static readonly ZERO: Rational = new Rational(0n, 1n);
  static readonly ONE: Rational = new Rational(1n, 1n);

  /** Build from integers, normalizing sign and reducing. Throws on den = 0. */
  static of(num: bigint | number, den: bigint | number = 1): Rational {
    return notImplemented('Rational.of');
  }

  /** Parse "3/4", "-2", "0.5". Returns null on invalid input or zero denominator. */
  static parse(text: string): Rational | null {
    return notImplemented('Rational.parse');
  }

  /** Convert a finite decimal number exactly, e.g. 0.1 -> 1/10. */
  static fromNumber(x: number): Rational {
    return notImplemented('Rational.fromNumber');
  }

  add(other: Rational): Rational {
    return notImplemented('Rational.add');
  }

  sub(other: Rational): Rational {
    return notImplemented('Rational.sub');
  }

  mul(other: Rational): Rational {
    return notImplemented('Rational.mul');
  }

  /** Throws on division by zero. */
  div(other: Rational): Rational {
    return notImplemented('Rational.div');
  }

  neg(): Rational {
    return notImplemented('Rational.neg');
  }

  abs(): Rational {
    return notImplemented('Rational.abs');
  }

  /** Throws on zero. */
  inv(): Rational {
    return notImplemented('Rational.inv');
  }

  /** -1, 0, or 1. */
  cmp(other: Rational): -1 | 0 | 1 {
    return notImplemented('Rational.cmp');
  }

  equals(other: Rational): boolean {
    return notImplemented('Rational.equals');
  }

  isZero(): boolean {
    return notImplemented('Rational.isZero');
  }

  isInteger(): boolean {
    return notImplemented('Rational.isInteger');
  }

  toNumber(): number {
    return notImplemented('Rational.toNumber');
  }

  /** "3", "-3/4". */
  toString(): string {
    return notImplemented('Rational.toString');
  }

  /** "3", "-\\frac{3}{4}". */
  toTex(): string {
    return notImplemented('Rational.toTex');
  }
}

/** Shorthand: q(3), q(3, 4), q('3/4'). Throws on invalid string input. */
export function q(value: number | bigint | string, den?: number | bigint): Rational {
  return notImplemented('q');
}
