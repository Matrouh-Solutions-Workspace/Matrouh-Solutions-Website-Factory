"use client";

import { useEffect } from "react";
import styles from "./landing.module.css";

export function LandingMotion() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-landing-page]");
    if (!page) return;

    const reveals = [...page.querySelectorAll<HTMLElement>("[data-reveal]")];
    const header = page.querySelector<HTMLElement>("[data-landing-header]");
    const navSections = [...page.querySelectorAll<HTMLElement>("main section[id]")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let revealObserver: IntersectionObserver | undefined;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((element) => element.setAttribute("data-visible", "true"));
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const element = entry.target as HTMLElement;
            element.setAttribute("data-visible", "true");
            revealObserver?.unobserve(element);
          });
        },
        { rootMargin: "0px 0px -10%", threshold: 0.08 },
      );
      reveals.forEach((element) => revealObserver?.observe(element));
    }

    let animationFrame = 0;
    const updateNavigation = () => {
      header?.toggleAttribute("data-scrolled", window.scrollY > 24);
      const activationLine = window.scrollY + Math.min(240, window.innerHeight * 0.36);
      const active = navSections
        .filter((section) => {
          const sectionTop = section.getBoundingClientRect().top + window.scrollY;
          return sectionTop <= activationLine;
        })
        .at(-1);

      page.querySelectorAll<HTMLElement>("[data-nav-target]").forEach((link) => {
        link.toggleAttribute(
          "data-current",
          Boolean(active && link.dataset.navTarget === active.id),
        );
      });
    };
    const scheduleNavigationUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateNavigation);
    };

    updateNavigation();
    window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
    window.addEventListener("resize", scheduleNavigationUpdate);

    page.setAttribute("data-motion-ready", "true");
    return () => {
      revealObserver?.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleNavigationUpdate);
      window.removeEventListener("resize", scheduleNavigationUpdate);
    };
  }, []);

  return <div aria-hidden="true" className={styles.scrollMarker} />;
}
