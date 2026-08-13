(() => {
  const initializeGallery = () => {
    const gallery = document.querySelector(".templateGallery");
    if (!gallery || gallery.hasAttribute("data-gallery-controller")) return;

    gallery.setAttribute("data-gallery-controller", "true");

    const themeToggle = gallery.querySelector("[data-gallery-theme-toggle]");
    const themeLabel = themeToggle?.querySelector("[data-gallery-theme-label]");
    const themeIcon = themeToggle?.querySelector("[data-gallery-theme-icon]");
    const appearanceKey = "factory:public-template-gallery:appearance";

    const applyTheme = (theme) => {
      const nextTheme = theme === "dark" ? "dark" : "light";
      const nextAction = nextTheme === "dark" ? "light" : "dark";
      const label = themeToggle?.getAttribute(`data-${nextAction}-label`) ?? "";

      gallery.setAttribute("data-theme", nextTheme);
      themeToggle?.setAttribute("aria-label", label);
      if (themeLabel) themeLabel.textContent = label;
      if (themeIcon) themeIcon.textContent = nextTheme === "dark" ? "☀" : "◐";
    };

    let savedTheme = "light";
    try {
      const savedAppearance = window.localStorage.getItem(appearanceKey);
      if (savedAppearance === "dark" || savedAppearance === "light") {
        savedTheme = savedAppearance;
      }
    } catch {
      // Appearance persistence is optional.
    }
    applyTheme(savedTheme);

    themeToggle?.addEventListener("click", () => {
      const nextTheme = gallery.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      try {
        window.localStorage.setItem(appearanceKey, nextTheme);
      } catch {
        // The current view still updates when local storage is unavailable.
      }
    });

    const reveals = [...gallery.querySelectorAll("[data-gallery-reveal]")];
    reveals.forEach((element, index) => {
      element.style.setProperty("--gallery-reveal-delay", `${Math.min(index % 4, 3) * 75}ms`);
    });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((element) => element.setAttribute("data-visible", "true"));
      gallery.setAttribute("data-gallery-motion-ready", "true");
      return;
    }

    gallery.setAttribute("data-gallery-motion-ready", "true");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-visible", "true");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );

    window.requestAnimationFrame(() => {
      reveals.forEach((element) => revealObserver.observe(element));
    });

    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      reveals.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < window.innerHeight * 0.92) {
          element.setAttribute("data-visible", "true");
        }
      });
    });
  };

  const scheduleInitialization = () => window.setTimeout(initializeGallery, 240);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleInitialization, { once: true });
  } else {
    scheduleInitialization();
  }
})();
