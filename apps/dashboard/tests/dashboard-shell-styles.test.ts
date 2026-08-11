import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesPath = resolve(process.cwd(), "src/app/styles.css");

async function dashboardStyles(): Promise<string> {
  return readFile(stylesPath, "utf8");
}

describe("dashboard shell direction and theme styles", () => {
  it("keeps the locale switch readable in dark mode", async () => {
    const styles = await dashboardStyles();

    expect(styles).toMatch(
      /:root\[data-theme="dark"\] \.appShell \.localeToggle\s*\{[^}]*background:\s*var\(--surface-soft\);[^}]*color:\s*var\(--ink\);/s,
    );
  });

  it("mirrors the desktop rail with the selected dashboard language", async () => {
    const styles = await dashboardStyles();

    expect(styles).toMatch(
      /\.appShell\[dir="ltr"\]:not\(\.clientShell\) \.sidebar\s*\{[^}]*right:\s*auto !important;[^}]*left:\s*0 !important;/s,
    );
    expect(styles).toMatch(
      /\.appShell\[dir="ltr"\]:not\(\.clientShell\) \.appFrame\s*\{[^}]*padding-right:\s*0 !important;[^}]*padding-left:\s*252px !important;/s,
    );
  });
});
