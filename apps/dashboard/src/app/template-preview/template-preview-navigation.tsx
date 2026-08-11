"use client";

import { useEffect, useId, useState } from "react";

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

export function TemplatePreviewNavigation({
  ariaLabel,
  initialAppearance,
  items,
  locale,
  localeItems,
}: {
  readonly ariaLabel: string;
  readonly initialAppearance: "dark" | "light";
  readonly items: readonly NavigationItem[];
  readonly locale: string;
  readonly localeItems: readonly LocaleItem[];
}) {
  const [open, setOpen] = useState(false);
  const [appearance, setAppearance] = useState<"dark" | "light">(initialAppearance);
  const navigationId = useId();
  const isArabic = locale.toLowerCase().startsWith("ar");

  useEffect(() => {
    const key = "factory:appearance:dashboard-template-preview";
    try {
      const saved = window.localStorage.getItem(key);
      if (saved === "dark" || saved === "light") applyAppearance(saved);
    } catch {
      // The preview remains usable when browser storage is unavailable.
    }

    function applyAppearance(next: "dark" | "light") {
      document.querySelector(".siteRoot")?.setAttribute("data-color-scheme", next);
      setAppearance(next);
    }
  }, []);

  function toggleAppearance() {
    const next = appearance === "dark" ? "light" : "dark";
    document.querySelector(".siteRoot")?.setAttribute("data-color-scheme", next);
    setAppearance(next);
    try {
      window.localStorage.setItem("factory:appearance:dashboard-template-preview", next);
    } catch {
      // The current preview can still switch even if persistence is disabled.
    }
  }

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
        {localeItems.length > 1 && (
          <span
            aria-label={isArabic ? "اللغة" : "Language"}
            className="localeSwitcher"
            role="group"
          >
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
        <button
          aria-label={
            appearance === "dark"
              ? isArabic
                ? "تفعيل الوضع الفاتح"
                : "Switch to light mode"
              : isArabic
                ? "تفعيل الوضع الداكن"
                : "Switch to dark mode"
          }
          className="appearanceToggle"
          onClick={toggleAppearance}
          title={appearance === "dark" ? (isArabic ? "فاتح" : "Light") : isArabic ? "داكن" : "Dark"}
          type="button"
        >
          <span aria-hidden>{appearance === "dark" ? "☀" : "◐"}</span>
          <span>
            {appearance === "dark" ? (isArabic ? "فاتح" : "Light") : isArabic ? "داكن" : "Dark"}
          </span>
        </button>
      </nav>
    </div>
  );
}
