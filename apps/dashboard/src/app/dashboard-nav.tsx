"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/app/icons";
import { logoutAction } from "@/app/login/actions";

const items = [
  { label: "Overview", href: "/", icon: "overview", group: "Workspace" },
  { label: "Websites", href: "/websites", icon: "websites", group: "Workspace" },
  { label: "Clients", href: "/clients", icon: "clients", group: "Workspace" },
  { label: "Templates", href: "/templates", icon: "templates", group: "Library" },
  { label: "Media", href: "/media", icon: "media", group: "Library" },
  { label: "Domains", href: "/domains", icon: "domains", group: "Optimize" },
  { label: "Search & social", href: "/seo", icon: "seo", group: "Optimize" },
  { label: "Plugins", href: "/plugins", icon: "plugins", group: "System" },
  { label: "Settings", href: "/settings", icon: "settings", group: "System" },
] satisfies readonly { label: string; href: string; icon: IconName; group: string }[];

export function DashboardNav({ onNavigate }: { readonly onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = [...new Set(items.map((item) => item.group))];
  return (
    <>
      <nav aria-label="Primary navigation" className="primaryNav">
        {groups.map((group) => (
          <div className="navGroup" key={group}>
            <p>{group}</p>
            {items
              .filter((item) => item.group === group)
              .map(({ label, href, icon }) => {
                const active = href === "/" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={active ? "active" : ""}
                    href={href}
                    key={href}
                    onClick={() => onNavigate?.()}
                  >
                    <span>
                      <Icon name={icon} />
                    </span>
                    <b>{label}</b>
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
            <small>Demo workspace</small>
          </div>
        </Link>
        <form action={logoutAction}>
          <button className="logoutButton" title="Sign out" type="submit">
            <Icon name="logout" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </>
  );
}
