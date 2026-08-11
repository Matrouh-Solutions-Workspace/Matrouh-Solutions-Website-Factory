"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import type { UiLocale } from "@/server/ui-locale";

interface LocalePreferenceLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly href: string;
  readonly locale: UiLocale;
}

export function LocalePreferenceLink({
  href,
  locale,
  onClick,
  ...properties
}: LocalePreferenceLinkProps) {
  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => undefined);
    window.location.assign(href);
  }

  return (
    <a
      {...properties}
      href={href}
      onClick={(event) => {
        void handleClick(event);
      }}
    />
  );
}
