"use client";

import { useEffect, useState } from "react";

export function CommerceSectionToggle({
  initiallyCollapsed = true,
  targetId,
}: {
  readonly initiallyCollapsed?: boolean;
  readonly targetId: string;
}) {
  // Keep the workspace calm on first load; hash navigation opens the requested section.
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === `#${targetId}`) setCollapsed(false);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [targetId]);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.classList.toggle("commercePanel--collapsed", collapsed);
    return () => target.classList.remove("commercePanel--collapsed");
  }, [collapsed, targetId]);

  return (
    <button
      aria-controls={targetId}
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Open section" : "Collapse section"}
      className="commerceSectionToggle"
      onClick={() => setCollapsed((value) => !value)}
      type="button"
    >
      <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
    </button>
  );
}
