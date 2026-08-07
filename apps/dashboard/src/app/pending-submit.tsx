"use client";

import { useFormStatus } from "react-dom";

interface PendingSubmitProps {
  children: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
}

export function PendingSubmit({
  children,
  pendingLabel,
  className,
  disabled = false,
}: PendingSubmitProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending || disabled}
      className={className}
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
