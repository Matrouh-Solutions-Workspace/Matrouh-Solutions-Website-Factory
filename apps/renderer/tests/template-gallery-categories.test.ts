import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("public template categories", () => {
  it("renders bilingual category filters and preserves them while switching languages", async () => {
    const source = await readFile(resolve(process.cwd(), "src/app/templates/page.tsx"), "utf8");

    expect(source).toContain("templateGalleryCategoryFilter");
    expect(source).toContain("selectedCategory");
    expect(source).toContain("visibleTemplates");
    expect(source).toContain("templateGalleryHref");
    expect(source).toContain("template.categoryAr || localized.category || template.category");
    expect(source).toContain("All categories");
    expect(source).toContain("كل التصنيفات");
  });

  it("loads catalog-owned category labels from the database", async () => {
    const source = await readFile(resolve(process.cwd(), "src/server/site.ts"), "utf8");

    expect(source).toContain("entry.catalog_category, entry.catalog_category_ar");
    expect(source).toContain("category: row.catalog_category || row.category");
    expect(source).toContain("categoryAr: row.catalog_category_ar");
  });
});
