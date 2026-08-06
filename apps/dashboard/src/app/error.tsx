"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="errorPage" role="alert">
      <p className="errorCode">Something went wrong</p>
      <h1>We could not load this view</h1>
      <p className="sub">Your data is safe. Retry the request, or return to the overview.</p>
      <div className="headerActions">
        <button onClick={reset} type="button">
          Try again
        </button>
        <a className="buttonLink secondaryButton" href="/">
          Back to overview
        </a>
      </div>
    </section>
  );
}
