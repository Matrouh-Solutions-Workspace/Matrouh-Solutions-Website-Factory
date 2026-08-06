"use client";

import type { MouseEvent } from "react";
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

  function confirmSubmission(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmation)) event.preventDefault();
  }

  return (
    <button
      aria-disabled={pending || disabled}
      className={className}
      disabled={pending || disabled}
      onClick={confirmSubmission}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
