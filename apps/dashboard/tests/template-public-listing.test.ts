import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardRoot = join(import.meta.dirname, "..");

describe("template public listing administration", () => {
  it("keeps category assignment with the installed template cards", async () => {
    const source = await readFile(join(dashboardRoot, "src/app/templates/page.tsx"), "utf8");

    expect(source).toContain('href="/dashboard/templates/public-listing"');
    expect(source).toContain("Manage listing");
    expect(source).toContain("<TemplateCategoryForm");
    expect(source).not.toContain("<TemplateCatalogSettingsForm");
  });

  it("provides a focused public listing workspace", async () => {
    const source = await readFile(
      join(dashboardRoot, "src/app/templates/public-listing/page.tsx"),
      "utf8",
    );

    expect(source).toContain("Listing controls");
    expect(source).toContain("templatePublicCatalogStats");
    expect(source).toContain("templatePublicListingEditor");
    expect(source).toContain("<TemplateCatalogSettingsForm");
  });

  it("exposes the catalog workspace as its own admin navigation item", async () => {
    const source = await readFile(join(dashboardRoot, "src/app/dashboard-nav.tsx"), "utf8");

    expect(source).toContain('key: "publicCatalog"');
    expect(source).toContain('href: "/templates/public-listing"');
    expect(source).toContain('publicCatalog: "الكتالوج العام"');
  });

  it("revalidates the listing workspace after saving", async () => {
    const source = await readFile(
      join(dashboardRoot, "src/app/templates/catalog-actions.ts"),
      "utf8",
    );

    expect(source).toContain('revalidatePath("/templates/public-listing")');
  });

  it("lets administrators classify every public template without changing its manifest", async () => {
    const [categoryForm, listingForm, action, catalog] = await Promise.all([
      readFile(join(dashboardRoot, "src/app/templates/template-category-form.tsx"), "utf8"),
      readFile(join(dashboardRoot, "src/app/templates/template-catalog-settings-form.tsx"), "utf8"),
      readFile(join(dashboardRoot, "src/app/templates/catalog-actions.ts"), "utf8"),
      readFile(join(dashboardRoot, "src/server/template-catalog.ts"), "utf8"),
    ]);

    expect(categoryForm).toContain('name="category"');
    expect(categoryForm).toContain('name="categoryAr"');
    expect(listingForm).not.toContain('name="category"');
    expect(listingForm).not.toContain('name="categoryAr"');
    expect(action).toContain("updateTemplateCategoryAction");
    expect(action).toContain("catalogCategory: category");
    expect(action).toContain("catalogCategoryAr: categoryAr || null");
    expect(catalog).toContain("category: row.catalogCategory || row.category");
  });

  it("does not mutate React-owned markup before or after hydration", async () => {
    const source = await readFile(
      join(dashboardRoot, "src/app/dashboard-locale-bridge.tsx"),
      "utf8",
    );

    expect(source).not.toContain('import { useEffect } from "react"');
    expect(source).not.toContain("useLayoutEffect");
    expect(source).not.toContain("new MutationObserver");
    expect(source).toContain("return null");
  });
});
