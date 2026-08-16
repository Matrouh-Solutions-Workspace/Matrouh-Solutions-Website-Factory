import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { template } from "../../src";
import { engineerHeroId } from "../../src/ids";

describe("engineer template contract", () => {
  it("has valid defaults for every schema", () => {
    expect(template.websiteSchema.safeParse({}).success).toBe(true);
    expect(template.theme.schema.safeParse(template.theme.defaults).success).toBe(true);
    for (const section of template.sections) {
      expect(section.schema.safeParse(section.defaults).success, section.title).toBe(true);
    }
  });

  it("declares bilingual routes and localizable authoring fields", () => {
    expect(template.routes.every((route) => route.localePolicy === "prefix-except-default")).toBe(
      true,
    );
    const localizableFields = template.sections.flatMap((section) =>
      Object.values(section.schema.fields).filter((field) => field.localization === "value"),
    );
    expect(localizableFields.length).toBeGreaterThanOrEqual(10);
  });

  it("accepts a launch-quality uploaded hero image", () => {
    const hero = template.sections.find((section) => section.id === engineerHeroId);
    expect(hero).toBeDefined();
    expect(hero?.schema.parse(hero.defaults)).toMatchObject({ heroMediaId: null });
    expect(
      hero?.schema.parse({
        ...(hero.defaults as Record<string, unknown>),
        heroMediaId: "30000000-0000-4000-8000-000000000099",
      }),
    ).toMatchObject({ heroMediaId: "30000000-0000-4000-8000-000000000099" });
    expect(hero?.schema.fields["/heroMediaId"]).toMatchObject({
      control: "media",
      mediaKinds: ["image"],
    });
  });

  it("ships a photographic default hero while preserving media replacement", async () => {
    const source = await readFile(resolve(process.cwd(), "src/sections/index.tsx"), "utf8");

    expect(source).toContain('/templates/engineer/engineer-hero.webp');
    expect(source).toContain('field(value, "heroMediaId")');
  });

  it("has a complete accessible page graph", () => {
    expect(template.pages.map((page) => page.title)).toEqual(["Home", "Projects", "Contact"]);
    expect(template.pages.every((page) => page.supportsSEO && page.supportsNavigation)).toBe(true);
    const sectionIds = new Set(template.sections.map((section) => section.id));
    expect(
      template.pages.every((page) =>
        page.defaultSections.every((section) => sectionIds.has(section.sectionTypeId)),
      ),
    ).toBe(true);
  });
});
