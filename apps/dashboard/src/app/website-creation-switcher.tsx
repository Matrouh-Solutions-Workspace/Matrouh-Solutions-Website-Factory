"use client";

import { useState, type ReactNode } from "react";

export function WebsiteCreationSwitcher({
  initialMode,
  websiteForm,
  commerceForm,
}: {
  initialMode: "website" | "commerce";
  websiteForm: ReactNode;
  commerceForm: ReactNode;
}) {
  const [mode, setMode] = useState(initialMode);
  return (
    <div className="websiteCreationSwitcher" id="create-workspace">
      <div className="websiteCreationChoices" role="group" aria-label="Choose what to create">
        <button aria-pressed={mode === "website"} className={mode === "website" ? "isActive" : ""} onClick={() => setMode("website")} type="button">Website, menu or portfolio</button>
        <button aria-pressed={mode === "commerce"} className={mode === "commerce" ? "isActive" : ""} onClick={() => setMode("commerce")} type="button">E-commerce store</button>
      </div>
      <div hidden={mode !== "website"}>{websiteForm}</div>
      <div hidden={mode !== "commerce"}>{commerceForm}</div>
    </div>
  );
}
