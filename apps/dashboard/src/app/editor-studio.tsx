"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import {
  applyPreviewColors,
  THEME_PREVIEW_COLORS_EVENT,
  type ThemePreviewColorsEvent,
} from "./theme-preview";

type SaveStatus = "saved" | "unsaved" | "saving" | "conflict" | "error";
type PreviewViewport = "desktop" | "tablet" | "mobile";
type PreviewIconName = PreviewViewport | "refresh" | "open" | "empty";

const PREVIEW_DIMENSIONS: Record<PreviewViewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

interface DraftSaveStatusEvent {
  readonly status: SaveStatus;
}

interface DraftContentSavedEvent {
  readonly websiteId: string;
}

export const DRAFT_SAVE_STATUS_EVENT = "factory:draft-save-status";
export const DRAFT_CONTENT_SAVED_EVENT = "factory:draft-content-saved";

function PreviewIcon({ name }: { readonly name: PreviewIconName }) {
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
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m12 3 9 9-9 9-9-9 9-9Z" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

export function EditorSaveStatus({ locale }: { readonly locale: "ar" | "en" }) {
  const [status, setStatus] = useState<SaveStatus>("saved");

  useEffect(() => {
    function update(event: Event) {
      const detail = (event as CustomEvent<DraftSaveStatusEvent>).detail;
      if (detail?.status) setStatus(detail.status);
    }
    window.addEventListener(DRAFT_SAVE_STATUS_EVENT, update);
    return () => window.removeEventListener(DRAFT_SAVE_STATUS_EVENT, update);
  }, []);

  const labels =
    locale === "ar"
      ? {
          saved: "تم حفظ كل التغييرات",
          unsaved: "تغييرات غير محفوظة",
          saving: "جارٍ الحفظ…",
          conflict: "يلزم دمج التغييرات",
          error: "تعذر الحفظ",
        }
      : {
          saved: "All changes saved",
          unsaved: "Unsaved changes",
          saving: "Saving…",
          conflict: "Changes need attention",
          error: "Save failed",
        };

  return (
    <div className={`editorGlobalSaveState editorGlobalSaveState--${status}`} aria-live="polite">
      <span aria-hidden="true" />
      <strong>{labels[status]}</strong>
      <kbd>Ctrl S</kbd>
    </div>
  );
}

export function EditorPreviewPane({
  createPreview,
  locale,
  title,
  websiteId,
}: {
  readonly createPreview: (websiteId: string) => Promise<string | null>;
  readonly locale: "ar" | "en";
  readonly title: string;
  readonly websiteId: string;
}) {
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [revision, setRevision] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ready" | "error">("loading");
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const previewColorsRef = useRef<Record<string, string>>({});
  const createPreviewRef = useRef(createPreview);
  const previewRequestRef = useRef(0);
  const previewRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  createPreviewRef.current = createPreview;
  const previewDimensions = PREVIEW_DIMENSIONS[viewport];
  const copy =
    locale === "ar"
      ? {
          title: "معاينة الموقع",
          draft: "معاينة المسودة",
          preparing: "جارٍ تجهيز معاينة المسودة…",
          unavailable: "تعذر تجهيز المعاينة",
          emptyTitle: "نجهز معاينة تعديلاتك",
          emptyBody: "ستظهر هنا المسودة الحالية، وتتحدث تلقائيًا بعد حفظ أي تعديل.",
          errorBody: "حاول تحديث المعاينة. لن يؤثر ذلك في الموقع المنشور.",
          refresh: "تحديث المعاينة",
          open: "فتح في تبويب جديد",
          desktop: "سطح المكتب",
          tablet: "جهاز لوحي",
          mobile: "هاتف",
        }
      : {
          title: "Website preview",
          draft: "Draft preview",
          preparing: "Preparing draft preview…",
          unavailable: "Preview unavailable",
          emptyTitle: "Preparing your latest edits",
          emptyBody: "The current draft appears here and refreshes automatically after each save.",
          errorBody: "Refresh the preview to try again. Your published website is unaffected.",
          refresh: "Refresh preview",
          open: "Open in new tab",
          desktop: "Desktop",
          tablet: "Tablet",
          mobile: "Mobile",
        };

  const refreshDraftPreview = useCallback(async () => {
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setPreviewStatus("loading");
    try {
      const nextSrc = await createPreviewRef.current(websiteId);
      if (previewRequestRef.current !== requestId) return;
      if (!nextSrc) {
        setPreviewStatus("error");
        return;
      }
      setPreviewSrc(nextSrc);
      setRevision((value) => value + 1);
      setPreviewStatus("ready");
    } catch {
      if (previewRequestRef.current === requestId) setPreviewStatus("error");
    }
  }, [websiteId]);

  useEffect(() => {
    void refreshDraftPreview();
  }, [refreshDraftPreview]);

  useEffect(() => {
    function refreshAfterSave(event: Event) {
      const detail = (event as CustomEvent<DraftContentSavedEvent>).detail;
      if (detail?.websiteId !== websiteId) return;
      if (previewRefreshTimerRef.current) clearTimeout(previewRefreshTimerRef.current);
      previewRefreshTimerRef.current = setTimeout(() => void refreshDraftPreview(), 350);
    }

    window.addEventListener(DRAFT_CONTENT_SAVED_EVENT, refreshAfterSave);
    return () => {
      window.removeEventListener(DRAFT_CONTENT_SAVED_EVENT, refreshAfterSave);
      if (previewRefreshTimerRef.current) clearTimeout(previewRefreshTimerRef.current);
    };
  }, [refreshDraftPreview, websiteId]);

  useEffect(() => {
    function applyThemePreview(event: Event) {
      const detail = (event as CustomEvent<ThemePreviewColorsEvent>).detail;
      if (detail?.websiteId !== websiteId) return;
      previewColorsRef.current = detail.colors;
      applyPreviewColors(previewFrameRef.current, detail.colors);
    }

    window.addEventListener(THEME_PREVIEW_COLORS_EVENT, applyThemePreview);
    return () => window.removeEventListener(THEME_PREVIEW_COLORS_EVENT, applyThemePreview);
  }, [websiteId]);

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
        availableWidth / previewDimensions.width,
        availableHeight / previewDimensions.height,
        1,
      );
      setPreviewScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [previewDimensions.height, previewDimensions.width]);

  return (
    <aside
      aria-busy={previewStatus === "loading"}
      aria-label={copy.title}
      className="editorStudioPreview"
    >
      <div className="editorPreviewToolbar">
        <div>
          <span>{copy.title}</span>
          <strong aria-live="polite">
            {previewStatus === "loading"
              ? copy.preparing
              : previewStatus === "error"
                ? copy.unavailable
                : copy.draft}
          </strong>
        </div>
        <div className="editorPreviewActions">
          <div className="editorViewportSwitch" role="group" aria-label={copy.title}>
            {(["desktop", "tablet", "mobile"] as const).map((option) => (
              <button
                aria-label={copy[option]}
                aria-pressed={viewport === option}
                key={option}
                onClick={() => setViewport(option)}
                title={copy[option]}
                type="button"
              >
                <PreviewIcon name={option} />
              </button>
            ))}
          </div>
          <button
            aria-label={copy.refresh}
            className="editorPreviewRefresh"
            disabled={previewStatus === "loading"}
            onClick={() => void refreshDraftPreview()}
            title={copy.refresh}
            type="button"
          >
            <PreviewIcon name="refresh" />
          </button>
          {previewSrc ? (
            <a
              aria-label={copy.open}
              href={previewSrc}
              rel="noreferrer"
              target="_blank"
              title={copy.open}
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
        {previewSrc ? (
          <div
            className="editorPreviewFrame"
            style={
              {
                "--preview-height": `${previewDimensions.height}px`,
                "--preview-rendered-height": `${previewDimensions.height * previewScale}px`,
                "--preview-rendered-width": `${previewDimensions.width * previewScale}px`,
                "--preview-scale": previewScale,
                "--preview-width": `${previewDimensions.width}px`,
              } as CSSProperties
            }
          >
            <iframe
              key={`${previewSrc}-${revision}`}
              onLoad={() => applyPreviewColors(previewFrameRef.current, previewColorsRef.current)}
              ref={previewFrameRef}
              src={previewSrc}
              title={`${title} — ${copy.draft}`}
            />
          </div>
        ) : (
          <div className="editorPreviewEmpty">
            <span aria-hidden="true">
              <PreviewIcon name="empty" />
            </span>
            <strong>{previewStatus === "error" ? copy.unavailable : copy.emptyTitle}</strong>
            <p>{previewStatus === "error" ? copy.errorBody : copy.emptyBody}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
