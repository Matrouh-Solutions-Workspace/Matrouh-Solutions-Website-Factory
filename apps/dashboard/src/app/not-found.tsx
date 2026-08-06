export default function NotFoundPage() {
  return (
    <section className="errorPage">
      <p className="errorCode">404 · Not found</p>
      <h1>This page is not available</h1>
      <p className="sub">It may have moved, been removed, or belong to another workspace.</p>
      <div className="headerActions">
        <a className="buttonLink" href="/">
          Return to overview
        </a>
        <a className="buttonLink secondaryButton" href="/websites">
          View websites
        </a>
      </div>
    </section>
  );
}
