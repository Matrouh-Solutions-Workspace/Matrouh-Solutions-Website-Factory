"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  incrementRevision,
  newestRevision,
  serializeWebsiteSave,
} from "@/app/draft-save-coordinator";

interface EditCommand {
  readonly name: string;
  readonly before: string;
  readonly after: string;
}

type SaveStatus = "saved" | "unsaved" | "saving" | "conflict" | "error";

const latestWebsiteRevisions = new Map<string, string>();

export function DraftEditorForm({
  action,
  children,
  className,
  autosaveDelay = 1_500,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly children: ReactNode;
  readonly className?: string;
  readonly autosaveDelay?: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const valuesRef = useRef(new Map<string, string>());
  const undoRef = useRef<EditCommand[]>([]);
  const redoRef = useRef<EditCommand[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRef = useRef(false);
  const savingRef = useRef(false);
  const saveAgainRef = useRef(false);
  const editRevisionRef = useRef(0);
  const entityRevisionRef = useRef<string | null>(null);
  const recoveryRequestedRef = useRef(false);
  const refreshObservedRef = useRef(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [showToast, setShowToast] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (status === "saving") {
      setShowToast(true);
      return;
    }
    if (status !== "saved") return;
    const timer = setTimeout(() => setShowToast(false), 1_600);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (refreshing) {
      refreshObservedRef.current = true;
      return;
    }
    if (!refreshObservedRef.current || !recoveryRequestedRef.current) return;
    refreshObservedRef.current = false;
    recoveryRequestedRef.current = false;
    setStatus("unsaved");
    const timer = setTimeout(() => formRef.current?.requestSubmit(), 0);
    return () => clearTimeout(timer);
  }, [refreshing]);

  async function submit(): Promise<void> {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savingRef.current) {
      saveAgainRef.current = true;
      return;
    }
    const form = formRef.current;
    if (!form) return;
    savingRef.current = true;
    setStatus("saving");
    try {
      do {
        saveAgainRef.current = false;
        const submittedEditRevision = editRevisionRef.current;
        const websiteId = fieldValueByName(form, "websiteId");
        if (!websiteId) throw new Error("DRAFT_WEBSITE_ID_MISSING");

        await serializeWebsiteSave(websiteId, async () => {
          const currentForm = formRef.current;
          if (!currentForm) throw new Error("DRAFT_FORM_UNAVAILABLE");
          const formData = new FormData(currentForm);
          const websiteRevision = newestRevision(
            latestWebsiteRevisions.get(websiteId) ?? null,
            stringFormValue(formData.get("websiteDraftRevision")),
          );
          if (websiteRevision) formData.set("websiteDraftRevision", websiteRevision);
          const entityRevision = newestRevision(
            entityRevisionRef.current,
            stringFormValue(formData.get("expectedRevision")),
          );
          if (entityRevision) formData.set("expectedRevision", entityRevision);

          await action(formData);

          entityRevisionRef.current = incrementRevision(entityRevision);
          const nextWebsiteRevision = incrementRevision(websiteRevision);
          if (nextWebsiteRevision) latestWebsiteRevisions.set(websiteId, nextWebsiteRevision);
        });

        if (editRevisionRef.current !== submittedEditRevision) saveAgainRef.current = true;
      } while (saveAgainRef.current);

      router.refresh();
      setStatus("saved");
      undoRef.current = [];
      redoRef.current = [];
      setHistoryRevision((value) => value + 1);
    } catch (error) {
      setShowToast(false);
      setStatus(
        error instanceof Error && error.message.includes("CONFLICT") ? "conflict" : "error",
      );
    } finally {
      savingRef.current = false;
    }
  }

  function rememberCurrent(event: FormEvent<HTMLFormElement>): void {
    const field = editableField(event.target);
    if (field?.name && !valuesRef.current.has(field.name)) {
      valuesRef.current.set(field.name, fieldValue(field));
    }
  }

  function changed(event: FormEvent<HTMLFormElement>): void {
    if (applyingRef.current) return;
    const field = editableField(event.target);
    if (!field?.name) return;
    editRevisionRef.current += 1;
    const after = fieldValue(field);
    const before = valuesRef.current.get(field.name) ?? after;
    if (before !== after) {
      undoRef.current.push({ name: field.name, before, after });
      if (undoRef.current.length > 100) undoRef.current.shift();
      redoRef.current = [];
      valuesRef.current.set(field.name, after);
      setHistoryRevision((value) => value + 1);
    }
    setStatus("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => formRef.current?.requestSubmit(), autosaveDelay);
  }

  function undo(): void {
    const command = undoRef.current.pop();
    if (!command) return;
    applyCommand(command.name, command.before);
    redoRef.current.push(command);
    setHistoryRevision((value) => value + 1);
  }

  function redo(): void {
    const command = redoRef.current.pop();
    if (!command) return;
    applyCommand(command.name, command.after);
    undoRef.current.push(command);
    setHistoryRevision((value) => value + 1);
  }

  function refreshAndRetry(): void {
    if (refreshing || savingRef.current) return;
    recoveryRequestedRef.current = true;
    startRefresh(() => router.refresh());
  }

  function applyCommand(name: string, value: string): void {
    const field = formRef.current?.elements.namedItem(name);
    if (!(
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ))
      return;
    applyingRef.current = true;
    if (field instanceof HTMLInputElement && field.type === "checkbox")
      field.checked = value === "true";
    else field.value = value;
    valuesRef.current.set(name, value);
    editRevisionRef.current += 1;
    applyingRef.current = false;
    setStatus("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => formRef.current?.requestSubmit(), autosaveDelay);
  }

  void historyRevision;
  return (
    <form
      action={submit}
      className={className}
      onFocusCapture={rememberCurrent}
      onInput={changed}
      ref={formRef}
    >
      {showToast ? (
        <div className={`saveToast saveToast--${status}`} aria-live="polite" role="status">
          {status === "saving" ? "Saving changes…" : "Saved successfully"}
        </div>
      ) : null}
      <div className="draftCommandBar" aria-label="Edit history">
        <div
          className={`saveProgress saveProgress--${refreshing ? "refreshing" : status}`}
          aria-hidden="true"
        >
          <span />
        </div>
        <span
          className={`saveState saveState--${refreshing ? "saving" : status}`}
          aria-live="polite"
          role="status"
        >
          {refreshing
            ? "Refreshing latest revision..."
            : status === "saving"
              ? "Saving..."
              : status === "unsaved"
                ? "Unsaved changes"
                : status === "conflict"
                  ? "This section changed elsewhere"
                  : status === "error"
                    ? "Save failed — retry"
                    : "Saved"}
        </span>
        {status === "conflict" ? (
          <button
            className="saveRecoveryButton"
            disabled={refreshing}
            onClick={refreshAndRetry}
            type="button"
          >
            {refreshing ? "Refreshing..." : "Refresh & retry"}
          </button>
        ) : null}
        {status === "error" ? (
          <button
            className="saveRetryButton"
            onClick={() => formRef.current?.requestSubmit()}
            type="button"
          >
            Retry
          </button>
        ) : null}
        <button disabled={undoRef.current.length === 0} onClick={undo} type="button">
          Undo
        </button>
        <button disabled={redoRef.current.length === 0} onClick={redo} type="button">
          Redo
        </button>
      </div>
      {children}
    </form>
  );
}

function editableField(
  value: EventTarget,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  if (
    value instanceof HTMLInputElement &&
    value.type !== "submit" &&
    (value.type !== "hidden" || value.dataset.autosave !== undefined)
  )
    return value;
  if (value instanceof HTMLTextAreaElement || value instanceof HTMLSelectElement) return value;
  return null;
}

function fieldValue(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  return field instanceof HTMLInputElement && field.type === "checkbox"
    ? String(field.checked)
    : field.value;
}

function fieldValueByName(form: HTMLFormElement, name: string): string | null {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value : null;
}

function stringFormValue(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}
