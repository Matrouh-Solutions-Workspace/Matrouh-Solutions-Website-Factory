import { describe, expect, it } from "vitest";
import type { TemplateRenderContext } from "@factory/template-sdk";
import { template } from "../../src";
import { foodMenuCatalogId, foodMenuImportId, foodMenuVisitId } from "../../src/ids";

describe("food and café menu template contract", () => {
  it("validates settings, theme, and every section default", () => {
    expect(template.websiteSchema.safeParse({}).success).toBe(true);
    expect(template.theme.schema.safeParse(template.theme.defaults).success).toBe(true);
    for (const section of template.sections) {
      expect(section.schema.safeParse(section.defaults).success, section.title).toBe(true);
    }
  });

  it("models categories, items, optional images, and size prices as reusable data", () => {
    const catalog = template.sections.find((section) => section.id === foodMenuCatalogId);
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
    const defaultImageUses = JSON.stringify(rendered).match(
      /\/templates\/food-menu\/food-cafe-hero\.jpg/g,
    );
    expect(defaultImageUses).toHaveLength(
      parsed.categories.flatMap((category) => category.items).length,
    );
  });

  it("keeps PDF import private and behind an explicit review status", () => {
    const importer = template.sections.find((section) => section.id === foodMenuImportId);
    expect(importer?.schema.fields["/importDraft"]?.control).toBe("document-import");
    expect(importer?.schema.parse(importer.defaults)).toMatchObject({
      importDraft: { status: "not_started", sourcePdfMediaId: null },
    });
    expect(
      importer?.render({
        value: importer.defaults,
        context: context("en"),
      }),
    ).toBeNull();
  });

  it("is locale-prefix aware and locks the initial appearance to light", () => {
    expect(template.routes).toHaveLength(1);
    expect(template.routes[0]?.localePolicy).toBe("prefix-except-default");
    expect(template.websiteSchema.parse({})).toMatchObject({
      colorMode: "light",
      allowAppearanceToggle: false,
    });
  });

  it("uses the configured WhatsApp contact as the safe default ordering action", () => {
    const visit = template.sections.find((section) => section.id === foodMenuVisitId);
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
    website: { id: "preview", name: "Saffron Café", defaultLocale: "en", settings: {} },
    locale,
    theme: template.theme.defaults,
    navigation: {},
    media: { url: (id) => `/media/${id}` },
    links: { url: (path) => path },
    features: { available: () => false },
  };
}
