import { describe, expect, it } from "vitest";
import { template as doctorTemplate } from "../../src/definition";
import { doctorHeroId } from "../../src/ids";

describe("doctor launch template", () => {
  it("accepts an uploaded portrait and keeps it optional", () => {
    const hero = doctorTemplate.sections.find((section) => section.id === doctorHeroId);
    expect(hero).toBeDefined();
    expect(hero?.schema.parse(hero.defaults)).toMatchObject({ heroMediaId: null });
    expect(
      hero?.schema.parse({
        ...(hero.defaults as Record<string, unknown>),
        heroMediaId: "10000000-0000-4000-8000-000000000099",
      }),
    ).toMatchObject({ heroMediaId: "10000000-0000-4000-8000-000000000099" });
    expect(hero?.schema.fields["/heroMediaId"]).toMatchObject({
      control: "media",
      mediaKinds: ["image"],
    });
  });

  it("ships bilingual routing and localizable authoring fields", () => {
    expect(
      doctorTemplate.routes.every((route) => route.localePolicy === "prefix-except-default"),
    ).toBe(true);
    expect(doctorTemplate.navigation[0]?.localization).toBe("localized-labels");
    const localizableFields = doctorTemplate.sections.flatMap((section) =>
      Object.values(section.schema.fields).filter((field) => field.localization === "value"),
    );
    expect(localizableFields.length).toBeGreaterThanOrEqual(10);
  });
});
