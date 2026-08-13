"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardNav } from "@/app/dashboard-nav";
import { DashboardLocaleBridge } from "@/app/dashboard-locale-bridge";
import { Icon } from "@/app/icons";
import { logoutAction } from "@/app/login/actions";
import { LocalePreferenceLink } from "@/app/locale-preference-link";
import { ThemeToggle } from "@/app/theme-toggle";
import type { UiLocale } from "@/server/ui-locale";

const sidebarPreferenceKey = "factory-dashboard-sidebar-collapsed";

const copy = {
  ar: {
    collapseSidebar:
      "\u0637\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062c\u0627\u0646\u0628\u064a\u0629",
    expandSidebar:
      "\u062a\u0648\u0633\u064a\u0639 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062c\u0627\u0646\u0628\u064a\u0629",
    clientPortal: "بوابة العميل",
    signOut: "تسجيل الخروج",
    myWebsites: "مواقعي",
    viewLive: "فتح الموقع",
    controlPanel: "لوحة التحكم",
    overview: "نظرة عامة",
    websiteFactory: "مصنع المواقع",
    skip: "انتقل إلى المحتوى",
    closeNavigation: "إغلاق القائمة",
    openNavigation: "فتح القائمة",
    closeOverlay: "إغلاق غطاء القائمة",
    online: "لوحة التحكم متصلة",
    attention: "لوحة التحكم تحتاج إلى متابعة",
    checking: "جارٍ فحص لوحة التحكم",
    account: "حسابي",
    billing: "الفوترة",
    mail: "البريد",
    clients: "العملاء",
    websites: "المواقع",
    templates: "القوالب",
    media: "مكتبة الوسائط",
    domains: "النطاقات",
    monitoring: "المراقبة",
    seo: "البحث والشبكات",
    plugins: "الإضافات",
    settings: "الإعدادات",
  },
  en: {
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    clientPortal: "Client portal",
    signOut: "Sign out",
    myWebsites: "My websites",
    viewLive: "View live website",
    controlPanel: "Control panel",
    overview: "Overview",
    websiteFactory: "Website Factory",
    skip: "Skip to content",
    closeNavigation: "Close navigation",
    openNavigation: "Open navigation",
    closeOverlay: "Close navigation overlay",
    online: "Control panel online",
    attention: "Control panel needs attention",
    checking: "Checking control panel",
    account: "My account",
    billing: "Billing",
    mail: "Mail",
    clients: "Clients",
    websites: "Websites",
    templates: "Templates",
    media: "Media library",
    domains: "Domains",
    monitoring: "Monitoring",
    seo: "Search & social",
    plugins: "Plugins",
    settings: "Settings",
  },
} as const;

export function DashboardShell({
  children,
  locale,
}: {
  readonly children: React.ReactNode;
  readonly locale: UiLocale;
}) {
  const pathname = usePathname();
  const appPathname = normalizeDashboardPathname(pathname);
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const text = copy[locale];
  const alternateLocale = locale === "ar" ? "en" : "ar";
  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(sidebarPreferenceKey) === "true");
    } catch {
      // The expanded sidebar is the safe fallback when storage is unavailable.
    }
  }, []);
  if (
    appPathname === "/login" ||
    appPathname === "/forgot-password" ||
    appPathname.startsWith("/reset-password/") ||
    appPathname.startsWith("/template-preview/")
  ) {
    return <>{children}</>;
  }
  if (appPathname.startsWith("/account")) {
    return (
      <div className="appShell clientShell" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
        <DashboardLocaleBridge locale={locale} />
        <div className="appFrame">
          <div className="topbar">
            <div className="brand">
              <img alt="Matrouh Solutions" src="/matrouh-logo.png" />
              <strong>{text.clientPortal}</strong>
            </div>
            <div className="topbarActions">
              <LocalePreferenceLink
                className="localeToggle"
                href={pathname}
                locale={alternateLocale}
              >
                {alternateLocale === "ar" ? "العربية" : "English"}
              </LocalePreferenceLink>
              <ThemeToggle locale={locale} />
              <form action={logoutAction}>
                <button className="logoutButton" type="submit">
                  <Icon name="logout" />
                  <span>{text.signOut}</span>
                </button>
              </form>
            </div>
          </div>
          <main id="dashboard-content">{children}</main>
        </div>
      </div>
    );
  }
  const segment = appPathname.split("/").filter(Boolean)[0];
  const title = segment
    ? (text[segment as keyof typeof text] ?? text.websiteFactory)
    : text.overview;
  return (
    <div
      className={sidebarCollapsed ? "appShell sidebarIsCollapsed" : "appShell"}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
    >
      <DashboardLocaleBridge locale={locale} />
      <a className="skipLink" href="#dashboard-content">
        {text.skip}
      </a>
      <aside className={open ? "sidebar sidebarOpen" : "sidebar"}>
        <div className="brand">
          <img alt="Matrouh Solutions" src="/matrouh-logo.png" />
          <div>
            <strong>Matrouh</strong>
            <small>Website Factory</small>
          </div>
        </div>
        <button
          aria-label={text.closeNavigation}
          className="mobileClose"
          onClick={() => setOpen(false)}
          type="button"
        >
          <Icon name="close" />
        </button>
        <button
          aria-expanded={!sidebarCollapsed}
          aria-label={sidebarCollapsed ? text.expandSidebar : text.collapseSidebar}
          className="sidebarCollapseButton"
          onClick={() => {
            const next = !sidebarCollapsed;
            setSidebarCollapsed(next);
            try {
              window.localStorage.setItem(sidebarPreferenceKey, String(next));
            } catch {
              // Keep the in-memory preference when storage is unavailable.
            }
          }}
          title={sidebarCollapsed ? text.expandSidebar : text.collapseSidebar}
          type="button"
        >
          <Icon name="arrow" />
          <span>{sidebarCollapsed ? text.expandSidebar : text.collapseSidebar}</span>
        </button>
        <DashboardNav locale={locale} onNavigate={() => setOpen(false)} />
      </aside>
      {open && (
        <button
          aria-label={text.closeOverlay}
          className="navScrim"
          onClick={() => setOpen(false)}
          type="button"
        />
      )}
      <div className="appFrame">
        <div className="topbar">
          <button
            aria-expanded={open}
            aria-label={text.openNavigation}
            className="menuButton"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>{text.controlPanel}</span>
            <Icon name="arrow" />
            <strong>{title}</strong>
          </div>
          <div className="topbarActions">
            <LocalePreferenceLink className="localeToggle" href={pathname} locale={alternateLocale}>
              {alternateLocale === "ar" ? "العربية" : "English"}
            </LocalePreferenceLink>
            <ThemeToggle locale={locale} />
            <SystemStatus locale={locale} />
          </div>
        </div>
        <main id="dashboard-content">{children}</main>
      </div>
    </div>
  );
}

function normalizeDashboardPathname(pathname: string): string {
  if (pathname === "/dashboard") return "/";
  if (pathname.startsWith("/dashboard/")) return pathname.slice("/dashboard".length);
  return pathname;
}

function SystemStatus({ locale }: { readonly locale: UiLocale }) {
  const [status, setStatus] = useState<"checking" | "ready" | "unavailable">("checking");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/ready", { cache: "no-store", signal: controller.signal })
      .then((response) => setStatus(response.ok ? "ready" : "unavailable"))
      .catch(() => {
        if (!controller.signal.aborted) setStatus("unavailable");
      });
    return () => controller.abort();
  }, []);
  const text = copy[locale];
  const label =
    status === "ready" ? text.online : status === "unavailable" ? text.attention : text.checking;
  return (
    <div aria-live="polite" className={`systemStatus systemStatus--${status}`}>
      <span />
      <b>{label}</b>
    </div>
  );
}
