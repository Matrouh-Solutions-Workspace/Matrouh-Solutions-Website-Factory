"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/app/icons";
import { logoutAction } from "@/app/login/actions";
import type { UiLocale } from "@/server/ui-locale";

const itemDefinitions = [
  { key: "overview", href: "/", icon: "overview", group: "workspace" },
  { key: "websites", href: "/websites", icon: "websites", group: "workspace" },
  { key: "clients", href: "/clients", icon: "clients", group: "workspace" },
  { key: "billing", href: "/billing", icon: "settings", group: "workspace" },
  { key: "mail", href: "/mail", icon: "mail", group: "workspace" },
  { key: "templates", href: "/templates", icon: "templates", group: "library" },
  {
    key: "publicCatalog",
    href: "/templates/public-listing",
    icon: "settings",
    group: "library",
  },
  { key: "media", href: "/media", icon: "media", group: "library" },
  { key: "domains", href: "/domains", icon: "domains", group: "optimize" },
  { key: "monitoring", href: "/monitoring", icon: "monitoring", group: "system" },
  { key: "plugins", href: "/plugins", icon: "plugins", group: "system" },
  { key: "settings", href: "/settings", icon: "settings", group: "system" },
] satisfies readonly { key: string; href: string; icon: IconName; group: string }[];

const copy = {
  ar: {
    overview: "نظرة عامة",
    websites: "المواقع",
    clients: "العملاء",
    billing: "الفوترة",
    mail: "البريد",
    templates: "القوالب",
    publicCatalog: "الكتالوج العام",
    media: "مكتبة الوسائط",
    domains: "النطاقات",
    monitoring: "المراقبة",
    plugins: "الإضافات",
    settings: "الإعدادات",
    workspace: "مساحة العمل",
    library: "المكتبة",
    optimize: "التحسين",
    system: "النظام",
    controlPanel: "لوحة التحكم",
    signOut: "تسجيل الخروج",
  },
  en: {
    overview: "Overview",
    websites: "Websites",
    clients: "Clients",
    billing: "Billing",
    mail: "Mail",
    templates: "Templates",
    publicCatalog: "Public catalog",
    media: "Media library",
    domains: "Domains",
    monitoring: "Monitoring",
    plugins: "Plugins",
    settings: "Settings",
    workspace: "Workspace",
    library: "Library",
    optimize: "Optimize",
    system: "System",
    controlPanel: "Control panel",
    signOut: "Sign out",
  },
} as const;

export function DashboardNav({
  locale,
  onNavigate,
}: {
  readonly locale: UiLocale;
  readonly onNavigate?: () => void;
}) {
  const text = copy[locale];
  const rawPathname = usePathname();
  const pathname = rawPathname.startsWith("/dashboard/")
    ? rawPathname.slice("/dashboard".length)
    : rawPathname === "/dashboard"
      ? "/"
      : rawPathname;
  const groups = [...new Set(itemDefinitions.map((item) => item.group))];
  return (
    <>
      <nav aria-label="Primary navigation" className="primaryNav">
        {groups.map((group) => (
          <div className="navGroup" key={group}>
            <p>{text[group as keyof typeof text]}</p>
            {itemDefinitions
              .filter((item) => item.group === group)
              .map(({ key, href, icon }) => {
                const publicCatalogActive = pathname.startsWith("/templates/public-listing");
                const active =
                  href === "/"
                    ? pathname === href
                    : key === "templates"
                      ? pathname.startsWith(href) && !publicCatalogActive
                      : pathname.startsWith(href);
                const publicHref = href === "/" ? "/dashboard" : `/dashboard${href}`;
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={active ? "active" : ""}
                    href={publicHref}
                    key={href}
                    onClick={() => onNavigate?.()}
                    title={text[key as keyof typeof text]}
                  >
                    <span>
                      <Icon name={icon} />
                    </span>
                    <b>{text[key as keyof typeof text]}</b>
                    {active && <Icon className="navArrow" name="arrow" />}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
      <div className="sidebarFooter">
        <Link className="workspaceIdentity" href="/settings" onClick={() => onNavigate?.()}>
          <img alt="" src="/matrouh-logo.png" />
          <div>
            <strong>Matrouh Solutions</strong>
            <small>{text.controlPanel}</small>
          </div>
        </Link>
        <form action={logoutAction}>
          <button className="logoutButton" title={text.signOut} type="submit">
            <Icon name="logout" />
            <span>{text.signOut}</span>
          </button>
        </form>
      </div>
    </>
  );
}
