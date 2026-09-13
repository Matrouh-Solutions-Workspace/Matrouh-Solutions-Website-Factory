"use client";

import { useEffect, useRef, useState } from "react";

export function GalleryAppearanceToggle({ locale }: { readonly locale: "ar" | "en" }) {
  const buttonReference = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const labels =
    locale === "ar"
      ? { dark: "الوضع الداكن", light: "الوضع الفاتح" }
      : { dark: "Dark mode", light: "Light mode" };
  const nextTheme = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("factory:public-template-gallery:appearance");
      if (savedTheme === "dark") setTheme("dark");
    } catch {
      // Appearance persistence is optional.
    }

    const gallery = buttonReference.current?.closest<HTMLElement>(".templateGallery");
    if (!gallery) return;

    const reveals = [...gallery.querySelectorAll<HTMLElement>("[data-gallery-reveal]")];
    reveals.forEach((element, index) => {
      element.style.setProperty("--gallery-reveal-delay", `${Math.min(index % 4, 3) * 75}ms`);
    });

    gallery.dataset.galleryController = "true";
    gallery.dataset.galleryMotionReady = "true";

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      reveals.forEach((element) => {
        element.dataset.visible = "true";
      });
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.visible = "true";
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );
    reveals.forEach((element) => revealObserver.observe(element));

    return () => revealObserver.disconnect();
  }, []);

  useEffect(() => {
    const gallery = buttonReference.current?.closest<HTMLElement>(".templateGallery");
    if (gallery) gallery.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(nextTheme);
    try {
      window.localStorage.setItem("factory:public-template-gallery:appearance", nextTheme);
    } catch {
      // The view still updates when local storage is unavailable.
    }
  };

  return (
    <button
      aria-label={labels[nextTheme]}
      className="templateGalleryThemeToggle"
      onClick={toggleTheme}
      ref={buttonReference}
      type="button"
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "◐"}</span>
      <span>{labels[nextTheme]}</span>
    </button>
  );
}
