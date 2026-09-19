import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(process.cwd());

describe("commerce overview", () => {
  it("loads the tenant-bound store overview with one non-overlapping query", async () => {
    const source = await readFile(resolve(appRoot, "src/server/ecommerce.ts"), "utf8");
    const loader = source.slice(
      source.indexOf("export async function loadEcommerceStores"),
      source.indexOf("export async function loadEcommerceTemplates"),
    );

    expect(loader).not.toContain("Promise.all");
    expect(loader).not.toContain("include:");
    expect(loader.match(/transaction\.\$queryRaw/g)).toHaveLength(1);
    expect(loader).toContain("FROM ecommerce_stores store");
    expect(loader).toContain("SELECT count(*)::integer");
  });

  it("uses one website portfolio while preserving the dedicated commerce creation flow", async () => {
    const [page, legacyPage, createPanel, styles] = await Promise.all([
      readFile(resolve(appRoot, "src/app/websites/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "src/app/ecommerce/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "src/app/commerce-create-panel.tsx"), "utf8"),
      readFile(resolve(appRoot, "src/app/styles.css"), "utf8"),
    ]);

    expect(page).toContain("loadEcommerceStores");
    expect(page).toContain("CommerceCreatePanel");
    expect(page).toContain("WebsiteCreateWizard");
    expect(page).toContain("href={`/ecommerce/stores/${store.id}`}");
    expect(legacyPage).toContain("redirect(`/websites?type=commerce&create=commerce${error}`)");
    expect(page).toContain("WebsiteCreationSwitcher");
    expect(page).toContain("WebsiteInventory");
    expect(page).not.toContain('method="get"');
    expect(page).not.toContain('type === "commerce"');
    expect(createPanel).toContain("/templates#ecommerce-templates");
    expect(createPanel).toContain('className="panel createPanel commerceCreatePanel"');
    expect(createPanel).toContain("createEcommerceStoreAction");
    expect(page).toContain("loadHostingDomainChoices");
    expect(createPanel).toContain("hostnameRoot");
    expect(createPanel).toContain("pendingLabel=");
    expect(createPanel).toContain('className="commerceCreateError"');
    expect(styles).toContain(".unifiedCommerceRow");
  });

  it("archives stores through an administrator-only audited workflow", async () => {
    const [actions, control] = await Promise.all([
      readFile(resolve(appRoot, "src/app/ecommerce/actions.ts"), "utf8"),
      readFile(resolve(appRoot, "src/app/ecommerce-store-delete-action.tsx"), "utf8"),
    ]);

    expect(actions).toContain("export async function deleteEcommerceStoreAction");
    expect(actions).toContain("requireCommerceAdministrator()");
    expect(actions).toContain('status: "archived", archivedAt: now');
    expect(actions).toContain('status: "disconnected", releasedAt: now');
    expect(actions).toContain('action: "ecommerce.store_archived"');
    expect(control).toContain("window.confirm");
  });

  it("shows live storefront previews in the commerce template library", async () => {
    const [page, styles] = await Promise.all([
      readFile(resolve(appRoot, "src/app/ecommerce/templates/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "src/app/styles.css"), "utf8"),
    ]);

    expect(page).toContain("commerce-template-preview");
    expect(page).toContain("commerceTemplatePreview");
    expect(styles).toContain(".commerceTemplatePreview iframe");
  });

  it("includes e-commerce designs in the main template catalog", async () => {
    const page = await readFile(resolve(appRoot, "src/app/templates/page.tsx"), "utf8");
    expect(page).toContain("loadEcommerceTemplates");
    expect(page).toContain("commerce-template-preview");
    expect(page).toContain('id="ecommerce-templates"');
    expect(page.match(/className="templateCatalogGrid"/g)).toHaveLength(1);
    expect(page.indexOf("commerceTemplates.map")).toBeLessThan(
      page.indexOf("{templates.map((template) => {"),
    );
  });
});
