"use client";

import { useEffect, useRef, useState } from "react";

type Appearance = "light" | "dark";

function savedAppearance(storageKey: string): Appearance | null {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

function applyAppearance(button: HTMLButtonElement | null, appearance: Appearance): void {
  const root = button?.closest<HTMLElement>(".siteRoot");
  if (!root) return;
  root.dataset.colorScheme = appearance;
  root.style.colorScheme = appearance;
}

export function AppearanceToggle({
  initialAppearance,
  locale,
  storageKey,
}: {
  readonly initialAppearance: Appearance;
  readonly locale: string;
  readonly storageKey: string;
}) {
  const [appearance, setAppearance] = useState<Appearance>(initialAppearance);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isArabic = locale === "ar";
  const isDark = appearance === "dark";
  const darkLabel = isArabic ? "تفعيل الوضع الداكن" : "Switch to dark mode";
  const lightLabel = isArabic ? "تفعيل الوضع الفاتح" : "Switch to light mode";
  const darkText = isArabic ? "داكن" : "Dark";
  const lightText = isArabic ? "فاتح" : "Light";

  useEffect(() => {
    const nextAppearance = savedAppearance(storageKey) ?? initialAppearance;
    setAppearance(nextAppearance);
    applyAppearance(buttonRef.current, nextAppearance);

    function syncAcrossTabs(event: StorageEvent) {
      if (event.key !== storageKey || (event.newValue !== "dark" && event.newValue !== "light")) {
        return;
      }
      setAppearance(event.newValue);
      applyAppearance(buttonRef.current, event.newValue);
    }

    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, [initialAppearance, storageKey]);

  function toggleAppearance() {
    const nextAppearance: Appearance = isDark ? "light" : "dark";
    setAppearance(nextAppearance);
    applyAppearance(buttonRef.current, nextAppearance);
    try {
      window.localStorage.setItem(storageKey, nextAppearance);
    } catch {
      // The visual toggle still works when browser storage is unavailable.
    }
  }

  return (
    <button
      aria-label={isDark ? lightLabel : darkLabel}
      className="appearanceToggle"
      data-appearance-toggle
      onClick={toggleAppearance}
      ref={buttonRef}
      title={isDark ? lightLabel : darkLabel}
      type="button"
    >
      <span aria-hidden>{isDark ? "☀" : "☾"}</span>
      <span>{isDark ? lightText : darkText}</span>
    </button>
  );
}
