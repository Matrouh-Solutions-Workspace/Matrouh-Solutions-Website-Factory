"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UiLocale } from "@/server/ui-locale";

const ACTIVE_JOB_STATUSES = new Set(["queued", "running", "retryable"]);

interface ClientPublicationActionProps {
  readonly websiteId: string;
  readonly pendingUpdate: boolean;
  readonly jobStatus: string | null;
  readonly locale: UiLocale;
  readonly action: (formData: FormData) => Promise<void>;
}

export function ClientPublicationAction({
  websiteId,
  pendingUpdate,
  jobStatus,
  locale,
  action,
}: ClientPublicationActionProps) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasActiveJob = jobStatus !== null && ACTIVE_JOB_STATUSES.has(jobStatus);
  const waitingForPublication = submitted || hasActiveJob;
  const isArabic = locale === "ar";

  useEffect(() => {
    if (!waitingForPublication || !pendingUpdate) return;
    const timer = window.setTimeout(() => router.refresh(), 1_500);
    return () => window.clearTimeout(timer);
  }, [pendingUpdate, router, waitingForPublication]);

  function publish(formData: FormData): void {
    setSubmitted(true);
    setError(false);
    startTransition(async () => {
      try {
        await action(formData);
        router.refresh();
      } catch {
        setSubmitted(false);
        setError(true);
      }
    });
  }

  if (!pendingUpdate) {
    return submitted && jobStatus === "succeeded" ? (
      <p className="clientPublicationFeedback clientPublicationFeedback--success" role="status">
        {isArabic ? "تم نشر آخر التغييرات بنجاح." : "Your latest changes are now published."}
      </p>
    ) : null;
  }

  const statusText = error
    ? isArabic
      ? "تعذر بدء النشر. حاول مرة أخرى."
      : "We could not start publishing. Please try again."
    : waitingForPublication
      ? isArabic
        ? "جارٍ نشر التغييرات. ستتحدث هذه الصفحة تلقائيًا."
        : "Publishing your changes. This page will update automatically."
      : isArabic
        ? "التغييرات محفوظة وجاهزة للنشر."
        : "Your changes are saved and ready to publish.";

  return (
    <div className="clientPublicationControl" aria-live="polite">
      <form action={publish}>
        <input name="websiteId" type="hidden" value={websiteId} />
        <button disabled={isPending || hasActiveJob} type="submit">
          {isPending || hasActiveJob
            ? isArabic
              ? "جارٍ النشر…"
              : "Publishing…"
            : isArabic
              ? "نشر التغييرات"
              : "Publish changes"}
        </button>
      </form>
      <p
        className={
          error
            ? "clientPublicationFeedback clientPublicationFeedback--error"
            : "clientPublicationFeedback"
        }
        role="status"
      >
        {statusText}
      </p>
    </div>
  );
}
