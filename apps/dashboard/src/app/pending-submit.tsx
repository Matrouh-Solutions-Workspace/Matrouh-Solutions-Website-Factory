"use client";

import { useFormStatus } from "react-dom";

interface PendingSubmitProps {
  children: string;
  pendingLabel: string;
  className?: string;
}

export function PendingSubmit({ children, pendingLabel, className }: PendingSubmitProps) {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}
