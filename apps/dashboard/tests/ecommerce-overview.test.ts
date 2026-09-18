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

  it("renders native bilingual copy and a dedicated overview layout", async () => {
    const [page, styles] = await Promise.all([
      readFile(resolve(appRoot, "src/app/ecommerce/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "src/app/styles.css"), "utf8"),
    ]);

    expect(page).toContain('title: "E-commerce"');
    expect(page).toContain('title: "التجارة الإلكترونية"');
    expect(page).toContain('className="commerceOverviewStats"');
    expect(page).toContain('className="panel commerceCreatePanel"');
    expect(page).toContain("defaultValue={text.storeNamePlaceholder}");
    expect(page).toContain("pendingLabel={text.creatingStore}");
    expect(page).toContain("EcommerceStoreDeleteAction");
    expect(page).toContain("deleteStoreConfirmation");
    expect(page).toContain('className="commerceCreateError"');
    expect(styles).toContain(".commerceOverviewGrid");
    expect(styles).toContain(':root[data-theme="dark"] .appShell .commerceStatCard--primary');
    expect(styles).toContain(".commerceStoreDeleteForm");
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
});
