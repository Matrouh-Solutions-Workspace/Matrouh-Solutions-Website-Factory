import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyPreviewColors } from "../src/app/theme-preview";

const dashboardRoot = join(import.meta.dirname, "..");

describe("theme live editor", () => {
  it("applies draft colors to the site root instead of Next.js framework elements", () => {
    const properties = new Map<string, string>();
    const root = {
      style: {
        setProperty(name: string, value: string) {
          properties.set(name, value);
        },
      },
    };
    const selectors: string[] = [];
    const frame = {
      contentDocument: {
        querySelector(selector: string) {
          selectors.push(selector);
          return selector === ".siteRoot" ? root : null;
        },
      },
    } as unknown as HTMLIFrameElement;

    applyPreviewColors(frame, {
      primary: "#a4cbc1",
      background: "#f7f3eb",
      text: "#173b36",
    });

    expect(selectors).toEqual([".siteRoot"]);
    expect(Object.fromEntries(properties)).toEqual({
      "--theme-colors-primary": "#a4cbc1",
      "--theme-colors-background": "#f7f3eb",
      "--theme-colors-text": "#173b36",
      "--background": "#f7f3eb",
      "--text": "#173b36",
      "--primary": "#a4cbc1",
    });
  });

  it("uses the shared draft preview instead of rendering a legacy template iframe", async () => {
    const [themeEditor, previewPane] = await Promise.all([
      readFile(join(dashboardRoot, "src/app/theme-live-editor.tsx"), "utf8"),
      readFile(join(dashboardRoot, "src/app/editor-studio.tsx"), "utf8"),
    ]);

    expect(themeEditor).not.toContain("<iframe");
    expect(themeEditor).toContain("dispatchPreviewColors");
    expect(themeEditor).toContain("DRAFT_CONTENT_SAVED_EVENT");
    expect(previewPane).toContain("THEME_PREVIEW_COLORS_EVENT");
    expect(previewPane).toContain("applyPreviewColors(previewFrameRef.current");
  });
});
