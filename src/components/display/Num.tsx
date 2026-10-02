import type { Rational } from '../../core/rational';
import { useDataStore, type NumberDisplay } from '../../store/useDataStore';

/** Plain-text form of an exact value in the chosen display mode; fractions use a typographic minus. */
export function formatRational(value: Rational, mode: NumberDisplay, digits = 4): string {
  const text = mode === 'fraction' || value.isInteger() ? value.toString() : String(+value.toNumber().toFixed(digits));
  return text.replace('-', '−');
}

/** F-D7: a number shown as a decimal or an exact fraction; the exact value is always on hover. */
export function Num({ value, digits }: { value: Rational; digits?: number }) {
  const mode = useDataStore((s) => s.numberDisplay);
  return (
    <span className="num" title={`Exact: ${value.toString()}`}>
      {formatRational(value, mode, digits)}
    </span>
  );
}
