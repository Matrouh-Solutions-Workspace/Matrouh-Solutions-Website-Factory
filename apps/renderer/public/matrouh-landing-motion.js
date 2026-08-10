(() => {
  window.setTimeout(() => {
    const page = document.querySelector("[data-landing-page]");
    if (!page || page.hasAttribute("data-motion-controller")) return;

    page.setAttribute("data-motion-controller", "true");
    page.setAttribute("data-motion-ready", "true");

    const header = page.querySelector("[data-landing-header]");
    const navSections = [...page.querySelectorAll("main section[id]")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const trackedReveals = new Set();
    let revealObserver;
    let revealRegistrationFrame = 0;
    let revealStartTimer = 0;
    let navigationFrame = 0;

    const collectReveals = () => [...page.querySelectorAll("[data-reveal]")];
    const updateRevealVisibility = (element) => {
      const bounds = element.getBoundingClientRect();
      const isInRevealZone =
        bounds.bottom > window.innerHeight * 0.04 && bounds.top < window.innerHeight * 0.88;
      if (isInRevealZone) element.setAttribute("data-visible", "true");
      else element.removeAttribute("data-visible");
    };
    const showWithoutMotion = () => {
      collectReveals().forEach((element) => element.setAttribute("data-visible", "true"));
    };
    const observeNewReveals = () => {
      if (!revealObserver) return;
      trackedReveals.forEach((element) => {
        if (!element.isConnected) trackedReveals.delete(element);
      });
      collectReveals().forEach((element) => {
        if (trackedReveals.has(element)) return;
        element.removeAttribute("data-visible");
        trackedReveals.add(element);
        revealObserver.observe(element);
        updateRevealVisibility(element);
      });
    };
    const replayReveals = () => {
      if (!revealObserver) return;
      collectReveals().forEach((element) => {
        revealObserver.unobserve(element);
        element.removeAttribute("data-visible");
        trackedReveals.add(element);
      });
      window.clearTimeout(revealStartTimer);
      revealStartTimer = window.setTimeout(() => {
        trackedReveals.forEach((element) => {
          if (element.isConnected) {
            revealObserver.observe(element);
            updateRevealVisibility(element);
          }
        });
      }, 120);
    };
    const refreshRevealVisibility = () => {
      observeNewReveals();
      trackedReveals.forEach((element) => {
        if (element.isConnected) updateRevealVisibility(element);
      });
    };

    if (reducedMotion || !("IntersectionObserver" in window)) {
      showWithoutMotion();
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            updateRevealVisibility(entry.target);
          });
        },
        { rootMargin: "-4% 0px -12%", threshold: 0.06 },
      );
      collectReveals().forEach((element) => {
        element.removeAttribute("data-visible");
        trackedReveals.add(element);
      });
      revealStartTimer = window.setTimeout(() => {
        observeNewReveals();
        trackedReveals.forEach((element) => {
          if (element.isConnected) {
            revealObserver.observe(element);
            updateRevealVisibility(element);
          }
        });
      }, 120);
      const mutationObserver = new MutationObserver(() => {
        window.clearTimeout(revealRegistrationFrame);
        revealRegistrationFrame = window.setTimeout(observeNewReveals, 0);
      });
      mutationObserver.observe(page, { childList: true, subtree: true });
      window.setTimeout(refreshRevealVisibility, 500);
      document.fonts?.ready.then(refreshRevealVisibility);
    }

    const updateNavigation = () => {
      header?.toggleAttribute("data-scrolled", window.scrollY > 24);
      const activationLine = window.scrollY + Math.min(240, window.innerHeight * 0.36);
      const active = navSections
        .filter((section) => section.getBoundingClientRect().top + window.scrollY <= activationLine)
        .at(-1);
      page.querySelectorAll("[data-nav-target]").forEach((link) => {
        link.toggleAttribute(
          "data-current",
          Boolean(active && link.dataset.navTarget === active.id),
        );
      });
    };
    const scheduleNavigationUpdate = () => {
      window.cancelAnimationFrame(navigationFrame);
      navigationFrame = window.requestAnimationFrame(() => {
        updateNavigation();
        refreshRevealVisibility();
      });
    };

    updateNavigation();
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      if (reducedMotion) showWithoutMotion();
      else replayReveals();
    });
    window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
    window.addEventListener("resize", scheduleNavigationUpdate);
    window.addEventListener("load", refreshRevealVisibility, { once: true });
  }, 180);
})();
