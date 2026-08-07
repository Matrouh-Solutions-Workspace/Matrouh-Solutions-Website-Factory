import { describe, expect, it } from "vitest";
import { template as clinicTemplate } from "../../src/definition";
import { clinicHeroId } from "../../src/ids";

describe("clinic launch template", () => {
  it("accepts an uploaded hero image and keeps it optional", () => {
    const hero = clinicTemplate.sections.find((section) => section.id === clinicHeroId);
    expect(hero).toBeDefined();
    expect(hero?.schema.parse(hero.defaults)).toMatchObject({ heroMediaId: null });
    expect(
      hero?.schema.parse({
        ...(hero.defaults as Record<string, unknown>),
        heroMediaId: "20000000-0000-4000-8000-000000000099",
      }),
    ).toMatchObject({ heroMediaId: "20000000-0000-4000-8000-000000000099" });
    expect(hero?.schema.fields["/heroMediaId"]).toMatchObject({
      control: "media",
      mediaKinds: ["image"],
    });
  });

  it("ships bilingual routing and localizable authoring fields", () => {
    expect(
      clinicTemplate.routes.every((route) => route.localePolicy === "prefix-except-default"),
    ).toBe(true);
    expect(clinicTemplate.navigation[0]?.localization).toBe("localized-tree");
    const localizableFields = clinicTemplate.sections.flatMap((section) =>
      Object.values(section.schema.fields).filter((field) => field.localization === "value"),
    );
    expect(localizableFields.length).toBeGreaterThanOrEqual(5);
  });
});
