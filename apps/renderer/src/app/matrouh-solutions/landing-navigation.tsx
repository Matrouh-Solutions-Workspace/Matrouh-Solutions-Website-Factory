"use client";

import { useEffect, useRef } from "react";
import styles from "./landing-intro.module.css";

type NavigationGroup = {
  label: string;
  description: string;
  items: { label: string; description: string; href: string }[];
};

function NavigationDropdown({
  group,
  onNavigate,
}: {
  readonly group: NavigationGroup;
  readonly onNavigate?: () => void;
}) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (disclosure.current && !disclosure.current.contains(event.target as Node))
        disclosure.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  return (
    <details
      ref={disclosure}
      className={styles.dropdown}
      name="landing-navigation-group"
      onKeyDown={(event) => {
        if (event.key === "Escape" && disclosure.current?.open) {
          event.stopPropagation();
          disclosure.current.open = false;
          disclosure.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>
        {group.label}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>
      <div className={styles.dropdownPanel}>
        <p>{group.description}</p>
        {group.items.map((item) => (
          <a
            href={item.href}
            key={item.href}
            onClick={() => {
              if (disclosure.current) disclosure.current.open = false;
              onNavigate?.();
            }}
          >
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </details>
  );
}

export function LandingNavigation({ locale }: { readonly locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const mobile = useRef<HTMLDetailsElement>(null);
  const header = useRef<HTMLElement>(null);
  const closeMobile = () => {
    if (mobile.current) mobile.current.open = false;
  };
  useEffect(() => {
    const update = () => header.current?.toggleAttribute("data-compact", window.scrollY > 48);
    const dismiss = (event: PointerEvent) => {
      if (mobile.current?.open && !header.current?.contains(event.target as Node)) closeMobile();
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    const resize = () => {
      if (desktop.matches) closeMobile();
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    document.addEventListener("pointerdown", dismiss);
    desktop.addEventListener("change", resize);
    return () => {
      window.removeEventListener("scroll", update);
      document.removeEventListener("pointerdown", dismiss);
      desktop.removeEventListener("change", resize);
    };
  }, []);
  const links = [
    [ar ? "خدماتنا" : "Services", "#services"],
    [ar ? "القوالب" : "Templates", `/templates?locale=${locale}`],
    [ar ? "كيف نعمل" : "Our approach", "#process"],
  ];
  const groups: NavigationGroup[] = [
    {
      label: ar ? "خدماتنا" : "Services",
      description: ar ? "كل ما يحتاجه حضورك الرقمي" : "Everything your digital presence needs",
      items: [
        {
          label: ar ? "التصميم والهوية الرقمية" : "Design & digital identity",
          description: ar ? "تجربة تعكس قيمة علامتك" : "An experience that represents your brand",
          href: "#service-design",
        },
        {
          label: ar ? "المواقع ثنائية اللغة" : "Bilingual websites",
          description: ar ? "عربي وإنجليزي، من الأساس" : "Arabic and English from the ground up",
          href: "#service-bilingual",
        },
        {
          label: ar ? "الإطلاق والتشغيل" : "Launch & ongoing care",
          description: ar
            ? "من النشر إلى التطوير المستمر"
            : "From publishing to continued improvement",
          href: "#service-launch",
        },
      ],
    },
    {
      label: ar ? "القوالب" : "Templates",
      description: ar ? "نقطة بداية تناسب نشاطك" : "Find the right starting point",
      items: [
        {
          label: ar ? "استكشف جميع القوالب" : "Explore all templates",
          description: ar
            ? "تصفح التصاميم وشاهد المعاينات المباشرة"
            : "Browse designs and explore live previews",
          href: `/templates?locale=${locale}`,
        },
      ],
    },
  ];

  return (
    <header
      ref={header}
      className={styles.header}
      data-landing-header
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobile.current?.open) {
          closeMobile();
          mobile.current.querySelector("summary")?.focus();
        }
      }}
    >
      <a className={styles.skip} href="#landing-content">
        {ar ? "انتقل إلى المحتوى" : "Skip to content"}
      </a>
      <div className={styles.navInner}>
        <a className={styles.brand} href="/" aria-label="Matrouh Solutions">
          <img src="/matrouh-logo.png" alt="" width="42" height="42" />
          <span dir="ltr">
            <strong>
              Matrouh<span className={styles.brandDot}>.</span>
            </strong>
            <small>SOLUTIONS</small>
          </span>
        </a>
        <nav className={styles.desktopNav} aria-label={ar ? "التنقل الرئيسي" : "Main navigation"}>
          {groups.map((group) => (
            <NavigationDropdown key={group.label} group={group} />
          ))}
          {links.slice(2).map(([label, href]) => (
            <a
              key={href}
              href={href}
              data-nav-target={href?.startsWith("#") ? href.slice(1) : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.utilities}>
          <a
            className={styles.locale}
            href={ar ? "/en/matrouh-solutions" : "/matrouh-solutions"}
            hrefLang={ar ? "en" : "ar"}
            lang={ar ? "en" : "ar"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <ellipse cx="12" cy="12" rx="4" ry="9" />
              <path d="M3 12h18" />
            </svg>
            {ar ? "EN" : "العربية"}
          </a>
          <a className={styles.portal} href="/dashboard/login">
            {ar ? "دخول العملاء" : "Client login"}
          </a>
          <a className={styles.navCta} href="#contact">
            {ar ? "لنتحدث عن مشروعك" : "Let’s talk"}
            <span aria-hidden="true">↗</span>
          </a>
          <details ref={mobile} className={styles.mobileDisclosure}>
            <summary
              className={styles.menuToggle}
              aria-controls="landing-mobile-menu"
              aria-label={ar ? "قائمة التنقل" : "Navigation menu"}
            >
              <span className={styles.hamburger} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </summary>
            <nav
              id="landing-mobile-menu"
              className={styles.mobileMenu}

              aria-label={ar ? "قائمة الهاتف" : "Mobile navigation"}
            >
              {groups.map((group) => (
                <NavigationDropdown key={group.label} group={group} onNavigate={closeMobile} />
              ))}
              {links.slice(2).map(([label, href]) => (
                <a href={href} key={href} onClick={closeMobile}>
                  {label}
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
              <a href="/dashboard/login" onClick={closeMobile}>
                {ar ? "دخول العملاء" : "Client login"}
                <span aria-hidden="true">↗</span>
              </a>
              <a href="#contact" onClick={closeMobile}>
                {ar ? "لنتحدث عن مشروعك" : "Let’s talk"}
                <span aria-hidden="true">↗</span>
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
