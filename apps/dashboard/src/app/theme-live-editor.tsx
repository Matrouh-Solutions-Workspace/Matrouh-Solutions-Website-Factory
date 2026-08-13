"use client";

import { useEffect, useMemo, useState } from "react";
import { PendingSubmit } from "@/app/pending-submit";
import { DRAFT_CONTENT_SAVED_EVENT } from "./editor-studio";
import { dispatchPreviewColors } from "./theme-preview";

type ThemeTokens = {
  colors?: Record<string, string>;
  [key: string]: unknown;
};

const editableColors = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["accent", "Accent"],
  ["background", "Page background"],
  ["surface", "Cards"],
  ["heading", "Headings"],
  ["text", "Body text"],
] as const;

export function ThemeLiveEditor({
  action,
  websiteId,
  themeId,
  expectedRevision,
  websiteDraftRevision,
  initialTokens,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly websiteId: string;
  readonly themeId: string;
  readonly expectedRevision: string;
  readonly websiteDraftRevision: string;
  readonly initialTokens: string;
}) {
  const parsedInitial = useMemo(() => parseTokens(initialTokens), [initialTokens]);
  const [tokens, setTokens] = useState<ThemeTokens>(parsedInitial);
  const [advancedJson, setAdvancedJson] = useState(() => JSON.stringify(parsedInitial, null, 2));
  const [jsonError, setJsonError] = useState("");
  const colors = tokens.colors ?? {};

  useEffect(() => dispatchPreviewColors(websiteId, colors), [colors, websiteId]);

  async function saveTheme(formData: FormData) {
    await action(formData);
    window.dispatchEvent(
      new CustomEvent(DRAFT_CONTENT_SAVED_EVENT, {
        detail: { websiteId },
      }),
    );
  }

  function updateColor(key: string, value: string) {
    const next = { ...tokens, colors: { ...colors, [key]: value } };
    setTokens(next);
    setAdvancedJson(JSON.stringify(next, null, 2));
    setJsonError("");
  }

  function updateAdvanced(value: string) {
    setAdvancedJson(value);
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Theme must be a JSON object.");
      }
      setTokens(parsed as ThemeTokens);
      setJsonError("");
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  return (
    <form action={saveTheme} className="panel themeStudio">
      <input name="websiteId" type="hidden" value={websiteId} />
      <input name="themeId" type="hidden" value={themeId} />
      <input name="expectedRevision" type="hidden" value={expectedRevision} />
      <input name="websiteDraftRevision" type="hidden" value={websiteDraftRevision} />
      <input name="tokensJson" type="hidden" value={JSON.stringify(tokens)} />

      <div className="panelHead themeStudioHead">
        <div>
          <p className="eyebrow">Design studio</p>
          <h2>Brand colors</h2>
          <p>Every color change appears in the preview immediately.</p>
        </div>
        <span>Draft preview</span>
      </div>

      <div className="themeStudioLayout">
        <div className="themeControls">
          <div className="colorControlGrid">
            {editableColors.map(([key, label]) => {
              const value = normalizeColor(colors[key]);
              return (
                <label className="colorControl" key={key}>
                  <span>{label}</span>
                  <span className="colorInputRow">
                    <input
                      aria-label={`${label} color picker`}
                      onChange={(event) => updateColor(key, event.target.value)}
                      type="color"
                      value={value}
                    />
                    <input
                      aria-label={`${label} hex value`}
                      maxLength={9}
                      onChange={(event) => updateColor(key, event.target.value)}
                      value={colors[key] ?? value}
                    />
                  </span>
                </label>
              );
            })}
          </div>

          <details className="advancedTheme">
            <summary>Advanced theme JSON</summary>
            <label>
              Theme tokens
              <textarea
                aria-invalid={Boolean(jsonError)}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                onChange={(event) => updateAdvanced(event.target.value)}
                rows={12}
                spellCheck={false}
                value={advancedJson}
              />
            </label>
            {jsonError && <p className="fieldError">{jsonError}</p>}
          </details>
          <div className="themeStudioActions">
            <PendingSubmit pendingLabel="Saving theme...">Save theme</PendingSubmit>
            <small>Changes stay in draft until you publish.</small>
          </div>
        </div>

        <div className="themePreviewHandoff" role="status">
          <span aria-hidden="true">↗</span>
          <div>
            <strong>Previewing in the website canvas</strong>
            <p>
              Color changes now appear in the main draft preview. Save the theme to keep them in
              this draft and refresh the complete website preview.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

function parseTokens(value: string): ThemeTokens {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ThemeTokens)
      : {};
  } catch {
    return {};
  }
}

function normalizeColor(value: string | undefined): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}
