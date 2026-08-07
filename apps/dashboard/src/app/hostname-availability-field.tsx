"use client";

import { useEffect, useId, useState } from "react";

export type HostnameAvailability = "idle" | "checking" | "available" | "unavailable" | "invalid";

export function HostnameAvailabilityField({
  onAvailabilityChange,
}: {
  readonly onAvailabilityChange?: ((status: HostnameAvailability) => void) | undefined;
}) {
  const messageId = useId();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<HostnameAvailability>("idle");
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatus("idle");
      setHostname("");
      onAvailabilityChange?.("idle");
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setStatus("checking");
      onAvailabilityChange?.("checking");
      void fetch(`/api/domains/availability?hostname=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const result = (await response.json()) as { available?: boolean; hostname?: string };
          const nextStatus: HostnameAvailability = response.ok
            ? result.available
              ? "available"
              : "unavailable"
            : "invalid";
          setHostname(result.hostname ?? "");
          setStatus(nextStatus);
          onAvailabilityChange?.(nextStatus);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setStatus("invalid");
            onAvailabilityChange?.("invalid");
          }
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [onAvailabilityChange, value]);

  return (
    <label>
      Local hostname
      <input
        aria-describedby={messageId}
        autoComplete="off"
        maxLength={50}
        name="hostname"
        onChange={(event) => setValue(event.target.value)}
        placeholder="north-coast-clinic"
        required
        value={value}
      />
      <span className={`availabilityFeedback ${status}`} id={messageId} role="status">
        {availabilityMessage(status, hostname)}
      </span>
    </label>
  );
}

function availabilityMessage(status: HostnameAvailability, hostname: string): string {
  if (status === "checking") return "Checking availability…";
  if (status === "available") return `${hostname} is available.`;
  if (status === "unavailable") return `${hostname} is already in use.`;
  if (status === "invalid") return "Enter a valid Latin-letter subdomain.";
  return "Enter the exact subdomain you want. No suffix will be added.";
}
