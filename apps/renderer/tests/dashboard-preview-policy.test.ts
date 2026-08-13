import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard live preview framing", () => {
  it("allows only the configured dashboard origin to frame public websites", async () => {
    const config = await readFile(resolve(process.cwd(), "next.config.ts"), "utf8");

    expect(config).toContain("FACTORY_DASHBOARD_PUBLIC_URL");
    expect(config).toContain("const dashboardFrameAncestor");
    expect(config).toContain("frame-ancestors ${dashboardFrameAncestor}");
    expect(config).toContain("frame-ancestors 'none'");
  });

  it("renders private drafts with the same theme and navigation system as public sites", async () => {
    const preview = await readFile(
      resolve(process.cwd(), "src/app/preview/[[...path]]/page.tsx"),
      "utf8",
    );

    expect(preview).toContain("themeVariables(site.snapshot.theme)");
    expect(preview).toContain("<SiteNavigation");
    expect(preview).toContain("localeLinks(site.snapshot");
    expect(preview).toContain("previewRoute(item.href, token)");
    expect(preview).toContain("showAppearanceToggle");
    expect(preview).not.toContain("<AppearanceToggle");
  });
});
