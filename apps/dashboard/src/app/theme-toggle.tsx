"use client";

import { useEffect, useState } from "react";
import type { UiLocale } from "@/server/ui-locale";

type DashboardTheme = "light" | "dark";

export function ThemeToggle({ locale = "ar" }: { readonly locale?: UiLocale }) {
  const [theme, setTheme] = useState<DashboardTheme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("factory-dashboard-theme");
    const selected: DashboardTheme =
      saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(selected);
    document.documentElement.dataset.theme = selected;
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("factory-dashboard-theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <button
      aria-label={
        locale === "ar"
          ? `استخدم الوضع ${theme === "dark" ? "الفاتح" : "الداكن"}`
          : `Use ${theme === "dark" ? "light" : "dark"} mode`
      }
      className="themeToggle"
      onClick={toggle}
      type="button"
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
      <b>
        {locale === "ar"
          ? theme === "dark"
            ? "فاتح"
            : "داكن"
          : theme === "dark"
            ? "Light"
            : "Dark"}
      </b>
    </button>
  );
}
