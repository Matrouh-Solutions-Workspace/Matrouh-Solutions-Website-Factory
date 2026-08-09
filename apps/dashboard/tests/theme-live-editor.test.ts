import { describe, expect, it } from "vitest";
import { applyPreviewColors } from "../src/app/theme-preview";

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
});
