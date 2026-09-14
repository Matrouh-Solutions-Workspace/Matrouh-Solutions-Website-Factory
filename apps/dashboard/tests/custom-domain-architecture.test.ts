import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("website-scoped custom domains", () => {
  it("keeps custom routes out of the global domain workspace", async () => {
    const source = await readFile(resolve(process.cwd(), "src/server/control-data.ts"), "utf8");
    expect(source).toContain('releasedAt: null, kind: "subdomain"');
  });

  it("uses the platform administrator authorization boundary for mutations", async () => {
    const [auth, actions] = await Promise.all([
      readFile(resolve(process.cwd(), "src/server/auth.ts"), "utf8"),
      readFile(resolve(process.cwd(), "src/app/actions.ts"), "utf8"),
    ]);
    expect(auth).toContain("requireDomainAdministratorContext");
    expect(auth).toContain('role === "owner" || role === "admin"');
    expect(actions).toMatch(
      /configureWebsiteCustomDomainAction[\s\S]*requireDomainAdministratorContext\(\)/,
    );
  });

  it("does not load custom-domain settings into the client editor", async () => {
    const source = await readFile(resolve(process.cwd(), "src/server/editor.ts"), "utf8");
    expect(source).toMatch(/const customDomains = clientScoped\s*\? \[\]/);
  });

  it("provides the guided DNS, verification, live test, and subdomain workflow", async () => {
    const [page, setup, actions] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/app/custom-domain-setup.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/app/actions.ts"), "utf8"),
    ]);
    expect(setup).toContain("Add these DNS records");
    expect(setup).toContain("Customize subdomains");
    expect(page).toContain("Verify DNS and activate");
    expect(page).toContain("Test live route");
    expect(actions).toContain("testCustomDomainAction");
  });

  it("refreshes automatically while domain verification is running", async () => {
    const setup = await readFile(resolve(process.cwd(), "src/app/custom-domain-setup.tsx"), "utf8");
    expect(setup).toContain("CustomDomainStatusRefresh");
    expect(setup).toContain("router.refresh()");
  });
});
