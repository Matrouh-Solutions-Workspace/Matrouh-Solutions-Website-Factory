"use client";

import { useId, useState } from "react";

interface NavigationItem {
  readonly href: string;
  readonly id: string;
  readonly label: string;
}

export function TemplatePreviewNavigation({
  ariaLabel,
  items,
  locale,
}: {
  readonly ariaLabel: string;
  readonly items: readonly NavigationItem[];
  readonly locale: string;
}) {
  const [open, setOpen] = useState(false);
  const navigationId = useId();
  const isArabic = locale.toLowerCase().startsWith("ar");

  return (
    <div className="siteNavigation">
      <button
        aria-controls={navigationId}
        aria-expanded={open}
        aria-label={isArabic ? "فتح القائمة" : "Open menu"}
        className="siteNavigationToggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden className="siteMenuIcon" />
        <span>{isArabic ? "القائمة" : "Menu"}</span>
      </button>
      <nav aria-label={ariaLabel} data-open={open} id={navigationId}>
        {items.map((item) => (
          <a href={item.href} key={item.id} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
