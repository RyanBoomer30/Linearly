interface VectorEditorProps {
  label: string;
  values: string[];
  onChange: (i: number, value: string) => void;
  color?: string;
}

/** Single-column entry for u, v in the products view (L1-P1). */
export function VectorEditor({ label, values, onChange, color }: VectorEditorProps) {
  return (
    <div className="vector-editor">
      <span className="vector-label" style={{ color }}>{label}</span>
      {values.map((value, i) => (
        <input
          key={i}
          aria-label={`${label} entry ${i + 1}`}
          className="cell"
          value={value}
          onChange={(e) => onChange(i, e.target.value)}
        />
      ))}
    </div>
  );
}
