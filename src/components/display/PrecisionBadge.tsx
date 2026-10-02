import type { Precision } from '../../core/float';

/** F-D10: "exact" or "floating point", with the reason when a view has switched. */
export function PrecisionBadge({ precision }: { precision: Precision }) {
  return precision.kind === 'exact' ? (
    <span className="precision-badge exact" title="Every number here is an exact fraction">
      exact
    </span>
  ) : (
    <span className="precision-badge float" title={precision.reason}>
      floating point <span className="precision-reason">({precision.reason})</span>
    </span>
  );
}
