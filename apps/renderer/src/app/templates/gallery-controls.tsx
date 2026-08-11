"use client";

import { useEffect, useState } from "react";

export function GalleryAppearanceToggle({ locale }: { readonly locale: "ar" | "en" }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const isArabic = locale === "ar";

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("factory:public-template-gallery:appearance");
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {
      // The gallery still works without local storage.
    }
  }, []);

  useEffect(() => {
    document.querySelector(".templateGallery")?.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem("factory:public-template-gallery:appearance", next);
    } catch {
      // The visual preference is optional; the current view has already changed.
    }
  }

  const label =
    theme === "dark"
      ? isArabic
        ? "الوضع الفاتح"
        : "Light mode"
      : isArabic
        ? "الوضع الداكن"
        : "Dark mode";
  return (
    <button
      aria-label={label}
      className="templateGalleryThemeToggle"
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "◐"}</span>
      {label}
    </button>
  );
}
