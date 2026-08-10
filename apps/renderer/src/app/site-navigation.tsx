"use client";

import { useId, useState } from "react";
import { AppearanceToggle } from "@/app/appearance-toggle";

interface NavigationItem {
  readonly href: string;
  readonly id: string;
  readonly label: string;
}

interface LocaleItem extends NavigationItem {
  readonly current: boolean;
  readonly direction: "ltr" | "rtl";
  readonly locale: string;
}

export function SiteNavigation({
  ariaLabel,
  appearanceStorageKey,
  initialAppearance,
  items,
  locale,
  localeItems = [],
}: {
  readonly ariaLabel: string;
  readonly appearanceStorageKey: string;
  readonly initialAppearance: "dark" | "light";
  readonly items: readonly NavigationItem[];
  readonly locale: string;
  readonly localeItems?: readonly LocaleItem[];
}) {
  const [open, setOpen] = useState(false);
  const navigationId = useId();
  const menuLabel = locale === "ar" ? "القائمة" : "Menu";

  return (
    <div className="siteNavigation">
      <button
        aria-controls={navigationId}
        aria-expanded={open}
        aria-label={locale === "ar" ? "فتح القائمة" : "Open menu"}
        className="siteNavigationToggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden className="siteMenuIcon" />
        <span>{menuLabel}</span>
      </button>
      <nav aria-label={ariaLabel} data-open={open} id={navigationId}>
        {items.map((item) => (
          <a href={item.href} key={item.id} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
        {localeItems.length > 1 && (
          <span aria-label="Language" className="localeSwitcher" role="group">
            {localeItems.map((item) => (
              <a
                aria-current={item.current ? "page" : undefined}
                dir={item.direction}
                href={item.href}
                key={item.id}
                lang={item.locale}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </span>
        )}
        <AppearanceToggle
          initialAppearance={initialAppearance}
          locale={locale}
          storageKey={appearanceStorageKey}
        />
      </nav>
    </div>
  );
}
