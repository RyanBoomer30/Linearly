import Fraction from 'fraction.js';

/** Plain decimal or integer, optionally over an integer: "3", "-0.5", ".25", "3/4", "1/-2". */
const RATIONAL_RE = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*(?:\/\s*([+-]?\d+)\s*)?$/;

/**
 * Exact rational number (F-M1), backed by fraction.js (BigInt). Always stored
 * in lowest terms with a positive denominator, so structural equality matches
 * numeric equality.
 */
export class Rational {
  readonly num: bigint;
  readonly den: bigint;
  private readonly f: Fraction;

  private constructor(f: Fraction) {
    this.f = f;
    this.num = f.s * f.n;
    this.den = f.d;
  }

  static readonly ZERO: Rational = new Rational(new Fraction(0));
  static readonly ONE: Rational = new Rational(new Fraction(1));

  /** Build from integers, normalizing sign and reducing. Throws on den = 0. */
  static of(num: bigint | number, den: bigint | number = 1): Rational {
    if (den == 0) throw new RangeError('Rational: zero denominator');
    return new Rational(new Fraction(num, den));
  }

  /** Parse "3/4", "-2", "0.5". Returns null on invalid input or zero denominator. */
  static parse(text: string): Rational | null {
    const m = RATIONAL_RE.exec(text);
    if (!m) return null;
    const numerator = new Fraction(m[1]);
    if (m[2] === undefined) return new Rational(numerator);
    const den = BigInt(m[2]);
    if (den === 0n) return null;
    return new Rational(numerator.div(den));
  }

  /** Convert a finite decimal number exactly, e.g. 0.1 -> 1/10. */
  static fromNumber(x: number): Rational {
    if (!Number.isFinite(x)) throw new RangeError(`Rational: cannot convert ${x}`);
    return new Rational(new Fraction(x));
  }

  add(other: Rational): Rational {
    return new Rational(this.f.add(other.f));
  }

  sub(other: Rational): Rational {
    return new Rational(this.f.sub(other.f));
  }

  mul(other: Rational): Rational {
    return new Rational(this.f.mul(other.f));
  }

  /** Throws on division by zero. */
  div(other: Rational): Rational {
    if (other.isZero()) throw new RangeError('Rational: division by zero');
    return new Rational(this.f.div(other.f));
  }

  neg(): Rational {
    return new Rational(this.f.neg());
  }

  abs(): Rational {
    return new Rational(this.f.abs());
  }

  /** Throws on zero. */
  inv(): Rational {
    if (this.isZero()) throw new RangeError('Rational: inverse of zero');
    return new Rational(this.f.inverse());
  }

  /** -1, 0, or 1. */
  cmp(other: Rational): -1 | 0 | 1 {
    return Math.sign(this.f.compare(other.f)) as -1 | 0 | 1;
  }

  equals(other: Rational): boolean {
    return this.num === other.num && this.den === other.den;
  }

  isZero(): boolean {
    return this.num === 0n;
  }

  isInteger(): boolean {
    return this.den === 1n;
  }

  isNegative(): boolean {
    return this.num < 0n;
  }

  toNumber(): number {
    return this.f.valueOf();
  }

  /** "3", "-3/4". */
  toString(): string {
    return this.f.toFraction();
  }

  /** "3", "-\\frac{3}{4}". */
  toTex(): string {
    if (this.isInteger()) return this.num.toString();
    const sign = this.isNegative() ? '-' : '';
    return `${sign}\\frac{${this.f.n}}{${this.den}}`;
  }
}

/** Shorthand: q(3), q(3, 4), q('3/4'). Throws on invalid string input. */
export function q(value: number | bigint | string, den?: number | bigint): Rational {
  if (typeof value === 'string') {
    const r = Rational.parse(value);
    if (!r) throw new SyntaxError(`Not a rational number: "${value}"`);
    return den === undefined ? r : r.div(Rational.of(den));
  }
  if (typeof value === 'number' && !Number.isInteger(value)) {
    const r = Rational.fromNumber(value);
    return den === undefined ? r : r.div(Rational.of(den));
  }
  return Rational.of(value, den ?? 1);
}
