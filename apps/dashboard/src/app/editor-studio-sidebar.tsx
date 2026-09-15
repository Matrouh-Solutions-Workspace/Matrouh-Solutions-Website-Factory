"use client";

import { useState } from "react";

export function EditorStudioSidebar({
  children,
  locale,
}: {
  readonly children: React.ReactNode;
  readonly locale: "ar" | "en";
}) {
  const [collapsed, setCollapsed] = useState(false);
  const label = collapsed
    ? locale === "ar"
      ? "توسيع شريط المحرر"
      : "Expand editor sidebar"
    : locale === "ar"
      ? "تصغير شريط المحرر"
      : "Collapse editor sidebar";

  return (
    <aside className={`editorStudioSidebar${collapsed ? " editorStudioSidebar--collapsed" : ""}`}>
      <button
        aria-expanded={!collapsed}
        aria-label={label}
        className="editorStudioSidebarToggle"
        onClick={() => setCollapsed((value) => !value)}
        title={label}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
        </svg>
        <span className="srOnly">{label}</span>
      </button>
      {children}
    </aside>
  );
}
