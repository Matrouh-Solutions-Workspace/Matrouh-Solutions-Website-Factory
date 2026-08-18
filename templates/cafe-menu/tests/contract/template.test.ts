import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { TemplateRenderContext } from "@factory/template-sdk";
import { template } from "../../src";
import { cafeMenuCatalogId, cafeMenuVisitId } from "../../src/ids";

describe("café and restaurant QR menu template contract", () => {
  it("validates settings, theme, and every section default", () => {
    expect(template.websiteSchema.safeParse({}).success).toBe(true);
    expect(template.theme.schema.safeParse(template.theme.defaults).success).toBe(true);
    for (const section of template.sections) {
      expect(section.schema.safeParse(section.defaults).success, section.title).toBe(true);
    }
  });

  it("models categories, items, optional images, and size prices as reusable data", () => {
    const catalog = template.sections.find((section) => section.id === cafeMenuCatalogId);
    expect(catalog).toBeDefined();
    const parsed = catalog?.schema.parse(catalog.defaults) as {
      categories: { items: { pricingMode: string; sizes: unknown[] }[] }[];
    };
    expect(parsed.categories.length).toBeGreaterThanOrEqual(3);
    expect(parsed.categories.flatMap((category) => category.items)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pricingMode: "fixed" }),
        expect.objectContaining({ pricingMode: "variants" }),
      ]),
    );
    expect(
      parsed.categories.flatMap((category) => category.items).some((item) => item.sizes.length > 1),
    ).toBe(true);

    const rendered = catalog?.render({ value: catalog.defaults, context: context("en") });
    const serialized = JSON.stringify(rendered);
    expect(serialized).not.toContain("cafe-menu-cover-v2.png");
    expect(serialized).toContain("menu-breakfast-v3.webp");
    expect(serialized).toContain("menu-mains-v3.webp");
    expect(serialized).toContain("menu-drinks-v3.webp");
    expect(template.manifest.previewImage).toBe("/templates/cafe-menu/cafe-menu-cover-v2.png");
  });

  it("is locale-prefix aware and supports light and dark appearance", () => {
    expect(template.routes).toHaveLength(1);
    expect(template.routes[0]?.localePolicy).toBe("prefix-except-default");
    expect(template.websiteSchema.parse({})).toMatchObject({
      colorMode: "light",
      allowAppearanceToggle: true,
    });
    expect(template.websiteSchema.safeParse({ colorMode: "dark" }).success).toBe(true);
    expect(template.manifest.features).toEqual(
      expect.arrayContaining(["localized-content", "qr-code", "printable-qr", "dark-mode"]),
    );
  });

  it("keeps the mobile header and category controls inside narrow viewports", async () => {
    const styles = await readFile(resolve(process.cwd(), "src/sections/index.tsx"), "utf8");

    expect(styles).toContain(".siteBrand{flex:1 1 auto;min-width:0");
    expect(styles).toContain(".siteBrand strong{min-width:0;font-size:.82rem");
    expect(styles).toContain("@media(max-width:30rem)");
    expect(styles).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(styles).toContain(".cafeMenuCategoryNav a:first-child{grid-column:1/-1}");
  });

  it("uses the configured WhatsApp contact as the safe default ordering action", () => {
    const visit = template.sections.find((section) => section.id === cafeMenuVisitId);
    expect(visit).toBeDefined();
    if (!visit) throw new Error("Food menu visit section is missing");
    const defaults = visit.schema.parse(visit.defaults) as Record<string, unknown>;

    expect(defaults).toMatchObject({
      phone: "+20 128 428 9997",
      actionLabel: "Order on WhatsApp",
      actionHref: "https://wa.me/201284289997",
    });
    expect(
      visit.schema.safeParse({
        ...defaults,
        actionHref: "https://example.com/untrusted-order-page",
      }).success,
    ).toBe(false);
  });
});

function context(locale: string): TemplateRenderContext {
  return {
    request: { pathname: "/", search: {}, variantFlags: {} },
    website: { id: "preview", name: "Morning Room Café", defaultLocale: "en", settings: {} },
    locale,
    theme: template.theme.defaults,
    navigation: {},
    media: { url: (id) => `/media/${id}` },
    links: { url: (path) => path },
    features: { available: () => false },
  };
}
