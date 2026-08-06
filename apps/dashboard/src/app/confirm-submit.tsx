"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

interface ConfirmSubmitProps {
  readonly children: string;
  readonly pendingLabel: string;
  readonly confirmation: string;
  readonly className?: string;
  readonly disabled?: boolean;
}

export function ConfirmSubmit({
  children,
  pendingLabel,
  confirmation,
  className,
  disabled = false,
}: ConfirmSubmitProps) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        aria-disabled={pending || disabled}
        className={className}
        disabled={pending || disabled}
        onClick={() => setOpen(true)}
        type="button"
      >
        {pending ? pendingLabel : children}
      </button>
      {open && (
        <div className="modalOverlay" onMouseDown={() => setOpen(false)} role="presentation">
          <section
            aria-describedby="confirmation-message"
            aria-labelledby="confirmation-title"
            aria-modal="true"
            className="confirmationModal"
            onMouseDown={(event) => event.stopPropagation()}
            role="alertdialog"
          >
            <header>
              <p className="eyebrow">Destructive action</p>
              <h2 id="confirmation-title">Confirm this action</h2>
            </header>
            <p id="confirmation-message">{confirmation}</p>
            <footer>
              <button
                className="secondaryButton"
                onClick={() => setOpen(false)}
                ref={cancelRef}
                type="button"
              >
                Cancel
              </button>
              <button className="dangerAction" disabled={pending} type="submit">
                {pending ? pendingLabel : children}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
