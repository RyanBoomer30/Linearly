/** Skeleton placeholder: shows which stubbed function a view is waiting on. */
export function PendingNotice({ error }: { error: string }) {
  return (
    <div className="pending" role="status">
      <strong>Pending</strong> {error}
    </div>
  );
}
