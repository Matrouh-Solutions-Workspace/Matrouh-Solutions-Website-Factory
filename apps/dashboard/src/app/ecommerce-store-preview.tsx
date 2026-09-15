"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

type StorefrontViewport = "desktop" | "tablet" | "mobile";
type StorefrontPreviewIcon = StorefrontViewport | "refresh" | "open" | "close" | "store";

const STOREFRONT_DIMENSIONS: Record<StorefrontViewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

function PreviewIcon({ name }: { readonly name: StorefrontPreviewIcon }) {
  if (name === "desktop") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect height="13" rx="1.5" width="18" x="3" y="4" />
        <path d="M8 20h8M12 17v3" />
      </svg>
    );
  }
  if (name === "tablet") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect height="19" rx="2" width="14" x="5" y="2.5" />
        <path d="M10.5 18.5h3" />
      </svg>
    );
  }
  if (name === "mobile") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect height="20" rx="2" width="10" x="7" y="2" />
        <path d="M10.5 5h3M11 18.5h2" />
      </svg>
    );
  }
  if (name === "refresh") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20 6v5h-5" />
        <path d="M18.2 15.5a7.5 7.5 0 1 1-.4-8.5L20 11" />
      </svg>
    );
  }
  if (name === "open") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M14 4h6v6M20 4l-9 9" />
        <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 9.5 12 4l8 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-9Z" />
      <path d="M8 20v-7h8v7M3 9h18" />
    </svg>
  );
}

export function EcommerceStorePreview({
  initiallyVisible = true,
  openUrl,
  storeName,
  storefrontUrl,
}: {
  readonly initiallyVisible?: boolean;
  readonly openUrl?: string | null;
  readonly storeName: string;
  readonly storefrontUrl: string | null;
}) {
  const [viewport, setViewport] = useState<StorefrontViewport>("desktop");
  const [revision, setRevision] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);
  const [loading, setLoading] = useState(Boolean(storefrontUrl));
  const [previewVisible, setPreviewVisible] = useState(initiallyVisible);
  const [mobileOpen, setMobileOpen] = useState(false);
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const dimensions = STOREFRONT_DIMENSIONS[viewport];

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const updateScale = () => {
      const styles = window.getComputedStyle(canvas);
      const availableWidth =
        canvas.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const availableHeight =
        canvas.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
      const nextScale = Math.min(
        availableWidth / dimensions.width,
        availableHeight / dimensions.height,
        1,
      );
      setPreviewScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [dimensions.height, dimensions.width, mobileOpen]);

  useEffect(() => {
    if (!storefrontUrl) return;
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setLoading(true);
      setRevision((value) => value + 1);
    }, 10_000);
    return () => window.clearInterval(refreshInterval);
  }, [storefrontUrl]);

  function showPreview() {
    setPreviewVisible(true);
    setViewport("mobile");
    setMobileOpen(true);
  }

  function refreshPreview() {
    setLoading(Boolean(storefrontUrl));
    setRevision((value) => value + 1);
  }

  return (
    <>
      <button
        aria-expanded={mobileOpen}
        className={`ecommercePreviewLauncher${mobileOpen ? " ecommercePreviewLauncher--open" : ""}`}
        onClick={showPreview}
        type="button"
      >
        <PreviewIcon name="store" />
        <span>Preview storefront</span>
      </button>
      {previewVisible ? (
        <aside
          aria-busy={loading}
          aria-label="Storefront preview"
          aria-modal={mobileOpen || undefined}
          className={`editorStudioPreview ecommerceStorePreview${
            mobileOpen ? " ecommerceStorePreview--mobileOpen" : ""
          }`}
          role={mobileOpen ? "dialog" : undefined}
        >
          <div className="editorPreviewToolbar">
            <div>
              <span>Storefront preview</span>
              <strong aria-live="polite">
                {storefrontUrl
                  ? loading
                    ? "Loading storefront…"
                    : "Live storefront"
                  : "No domain"}
              </strong>
            </div>
            <div className="editorPreviewActions">
              <button
                aria-label="Close preview"
                className="ecommercePreviewClose"
                onClick={() => {
                  setMobileOpen(false);
                  setPreviewVisible(false);
                }}
                title="Close preview"
                type="button"
              >
                <PreviewIcon name="close" />
                <span>Close preview</span>
              </button>
              <div className="editorViewportSwitch" role="group" aria-label="Preview size">
                {(["desktop", "tablet", "mobile"] as const).map((option) => (
                  <button
                    aria-label={`${option} preview`}
                    aria-pressed={viewport === option}
                    key={option}
                    onClick={() => setViewport(option)}
                    title={option}
                    type="button"
                  >
                    <PreviewIcon name={option} />
                  </button>
                ))}
              </div>
              <button
                aria-label="Refresh preview"
                className="editorPreviewRefresh"
                disabled={!storefrontUrl}
                onClick={refreshPreview}
                title="Refresh preview"
                type="button"
              >
                <PreviewIcon name="refresh" />
              </button>
              {storefrontUrl ? (
                <a
                  aria-label="Open storefront in new tab"
                  href={openUrl ?? storefrontUrl}
                  rel="noreferrer"
                  target="_blank"
                  title="Open storefront in new tab"
                >
                  <PreviewIcon name="open" />
                </a>
              ) : null}
            </div>
          </div>
          <div
            className={`editorPreviewCanvas editorPreviewCanvas--${viewport}`}
            ref={previewCanvasRef}
          >
            {storefrontUrl ? (
              <div
                className="editorPreviewFrame"
                style={
                  {
                    "--preview-height": `${dimensions.height}px`,
                    "--preview-rendered-height": `${dimensions.height * previewScale}px`,
                    "--preview-rendered-width": `${dimensions.width * previewScale}px`,
                    "--preview-scale": previewScale,
                    "--preview-width": `${dimensions.width}px`,
                  } as CSSProperties
                }
              >
                <iframe
                  key={`${storefrontUrl}-${revision}`}
                  onLoad={() => setLoading(false)}
                  src={storefrontUrl}
                  title={`${storeName} — Live storefront`}
                />
              </div>
            ) : (
              <div className="editorPreviewEmpty">
                <span aria-hidden="true">
                  <PreviewIcon name="store" />
                </span>
                <strong>Storefront preview is unavailable</strong>
                <p>Connect a domain to this store and its live storefront will appear here.</p>
              </div>
            )}
          </div>
        </aside>
      ) : null}
    </>
  );
}
