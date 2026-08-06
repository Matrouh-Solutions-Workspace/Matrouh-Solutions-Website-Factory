export default function Loading() {
  return (
    <div aria-label="Loading dashboard" className="pageSkeleton" role="status">
      <div className="skeleton skeletonTitle" />
      <div className="skeletonGrid">
        <div className="skeleton skeletonCard" />
        <div className="skeleton skeletonCard" />
        <div className="skeleton skeletonCard" />
      </div>
      <div className="skeleton skeletonPanel" />
    </div>
  );
}
