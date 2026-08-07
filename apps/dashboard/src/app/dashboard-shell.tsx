"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardNav } from "@/app/dashboard-nav";
import { Icon } from "@/app/icons";
import { logoutAction } from "@/app/login/actions";
import { ThemeToggle } from "@/app/theme-toggle";

const titles: Record<string, string> = {
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
};

export function DashboardShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/login" || pathname.startsWith("/template-preview/")) return <>{children}</>;
  if (pathname.startsWith("/account")) {
    return (
      <div className="appShell clientShell" dir="rtl">
        <div className="appFrame">
          <div className="topbar">
            <div className="brand">
              <img alt="Matrouh Solutions" src="/matrouh-logo.png" />
              <strong>Client portal</strong>
            </div>
            <form action={logoutAction}>
              <button className="logoutButton" type="submit">
                <Icon name="logout" />
                <span>Sign out</span>
              </button>
            </form>
            <ThemeToggle />
          </div>
          <main id="dashboard-content">{children}</main>
        </div>
      </div>
    );
  }
  const segment = pathname.split("/").filter(Boolean)[0];
  const title = segment ? (titles[segment] ?? "Website Factory") : "Overview";
  return (
    <div className="appShell" dir="rtl">
      <a className="skipLink" href="#dashboard-content">
        Skip to content
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
          aria-label="Close navigation"
          className="mobileClose"
          onClick={() => setOpen(false)}
          type="button"
        >
          <Icon name="close" />
        </button>
        <DashboardNav onNavigate={() => setOpen(false)} />
      </aside>
      {open && (
        <button
          aria-label="Close navigation overlay"
          className="navScrim"
          onClick={() => setOpen(false)}
          type="button"
        />
      )}
      <div className="appFrame">
        <div className="topbar">
          <button
            aria-expanded={open}
            aria-label="Open navigation"
            className="menuButton"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>Control panel</span>
            <Icon name="arrow" />
            <strong>{title}</strong>
          </div>
          <div className="topbarActions">
            <ThemeToggle />
            <SystemStatus />
          </div>
        </div>
        <main id="dashboard-content">{children}</main>
      </div>
    </div>
  );
}

function SystemStatus() {
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
  const label =
    status === "ready"
      ? "Control panel online"
      : status === "unavailable"
        ? "Control panel needs attention"
        : "Checking control panel";
  return (
    <div aria-live="polite" className={`systemStatus systemStatus--${status}`}>
      <span />
      <b>{label}</b>
    </div>
  );
}
