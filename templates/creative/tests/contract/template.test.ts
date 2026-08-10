import { describe, expect, it } from "vitest";
import type { TemplateRenderContext } from "@factory/template-sdk";
import { template } from "../../src";
import { creativeHeroId } from "../../src/ids";

describe("creative portfolio template contract", () => {
  it("has valid defaults for every schema", () => {
    expect(template.websiteSchema.safeParse({}).success).toBe(true);
    expect(template.theme.schema.safeParse(template.theme.defaults).success).toBe(true);
    for (const section of template.sections) {
      expect(section.schema.safeParse(section.defaults).success, section.title).toBe(true);
    }
  });

  it("offers a complete portfolio page graph", () => {
    expect(template.pages.map((page) => page.title)).toEqual(["Home", "Work", "Contact"]);
    expect(template.pages.every((page) => page.supportsSEO && page.supportsNavigation)).toBe(true);
    const sectionIds = new Set(template.sections.map((section) => section.id));
    expect(
      template.pages.every((page) =>
        page.defaultSections.every((section) => sectionIds.has(section.sectionTypeId)),
      ),
    ).toBe(true);
  });

  it("ships with a portrait and accepts an uploaded replacement", () => {
    const hero = template.sections.find((section) => section.id === creativeHeroId);
    expect(hero).toBeDefined();
    expect(hero?.schema.parse(hero.defaults)).toMatchObject({
      heroMediaId: null,
      personName: "Omar Nassar",
    });
    expect(
      hero?.schema.parse({
        ...(hero.defaults as Record<string, unknown>),
        heroMediaId: "45000000-0000-4000-8000-000000000001",
      }),
    ).toMatchObject({ heroMediaId: "45000000-0000-4000-8000-000000000001" });
    expect(hero?.schema.fields["/heroMediaId"]).toMatchObject({
      control: "media",
      mediaKinds: ["image"],
    });
    expect(hero?.schema.fields["/personName"]).toMatchObject({ localization: "value" });
  });

  it("supports localized authoring and reduced route prefixes", () => {
    expect(template.routes.every((route) => route.localePolicy === "prefix-except-default")).toBe(
      true,
    );
    const localizableFields = template.sections.flatMap((section) =>
      Object.values(section.schema.fields).filter((entry) => entry.localization === "value"),
    );
    expect(localizableFields.length).toBeGreaterThanOrEqual(12);
  });

  it("renders Arabic interface labels and a localized owner name", () => {
    const hero = template.sections.find((section) => section.id === creativeHeroId);
    expect(hero).toBeDefined();
    const context: TemplateRenderContext = {
      request: { pathname: "/", search: {}, variantFlags: {} },
      website: { id: "preview", name: "ملف عمر", defaultLocale: "ar", settings: {} },
      locale: "ar",
      theme: template.theme.defaults,
      navigation: {},
      media: { url: (mediaId) => `/media/${mediaId}` },
      links: { url: (path) => path },
      features: { available: () => false },
    };
    const rendered = hero?.render({
      value: { ...(hero.defaults as Record<string, unknown>), personName: "عمر نصّار" },
      context,
    });
    const serialized = JSON.stringify(rendered);
    expect(serialized).toContain("عمر نصّار");
    expect(serialized).toContain("صورة شخصية");
    expect(serialized).toContain("استراتيجية · هوية · رقمي");
    expect(serialized).toContain("مرر لاكتشاف المزيد");
  });
});
