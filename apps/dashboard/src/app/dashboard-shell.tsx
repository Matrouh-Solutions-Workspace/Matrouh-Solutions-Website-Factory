"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardNav } from "@/app/dashboard-nav";
import { Icon } from "@/app/icons";

const titles: Record<string, string> = {
  clients: "Clients",
  websites: "Websites",
  templates: "Templates",
  media: "Media library",
  domains: "Domains",
  seo: "Search & social",
  plugins: "Plugins",
  settings: "Settings",
};

export function DashboardShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/login" || pathname.startsWith("/template-preview/")) return <>{children}</>;
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
            <span>Control plane</span>
            <Icon name="arrow" />
            <strong>{title}</strong>
          </div>
          <SystemStatus />
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
      ? "Systems operational"
      : status === "unavailable"
        ? "Service needs attention"
        : "Checking systems";
  return (
    <div aria-live="polite" className={`systemStatus systemStatus--${status}`}>
      <span />
      <b>{label}</b>
    </div>
  );
}
