"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

interface EditCommand {
  readonly name: string;
  readonly before: string;
  readonly after: string;
}

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
  const valuesRef = useRef(new Map<string, string>());
  const undoRef = useRef<EditCommand[]>([]);
  const redoRef = useRef<EditCommand[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRef = useRef(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [status, setStatus] = useState<"saved" | "unsaved" | "saving" | "conflict">("saved");
  const [showToast, setShowToast] = useState(false);

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

  async function submit(formData: FormData): Promise<void> {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
    try {
      await action(formData);
      setStatus("saved");
      undoRef.current = [];
      redoRef.current = [];
      setHistoryRevision((value) => value + 1);
    } catch {
      setStatus("conflict");
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
        <span className={`saveState saveState--${status}`}>
          {status === "saving"
            ? "Saving..."
            : status === "unsaved"
              ? "Unsaved changes"
              : status === "conflict"
                ? "Save conflict — refresh to merge"
                : "Saved"}
        </span>
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
