/** Explains why a view can't draw the current matrix (e.g. "can only be drawn in ℝ² or ℝ³"). */
export function ViewNotice({ error }: { error: string }) {
  return (
    <div className="view-notice" role="status">
      {error}
    </div>
  );
}
