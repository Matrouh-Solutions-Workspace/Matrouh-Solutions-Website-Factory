import { describe, expect, it } from "vitest";
import type { TemplateRenderContext } from "@factory/template-sdk";
import { template } from "../../src";
import { doctorContactId, doctorHeroId } from "../../src/ids";

const context = (locale: string): TemplateRenderContext => ({
  request: { pathname: "/", search: {}, variantFlags: {} },
  website: { id: "preview", name: "Medical Practice", defaultLocale: locale, settings: {} },
  locale,
  theme: template.theme.defaults,
  navigation: {},
  media: { url: (mediaId) => `/media/${mediaId}` },
  links: { url: (path) => path },
  features: { available: () => false },
});

describe("medical practice 1.7 contract", () => {
  it("renders a real default hero portrait", () => {
    const hero = template.sections.find((section) => section.id === doctorHeroId);
    expect(hero).toBeDefined();

    const rendered = hero?.render({ value: hero.defaults, context: context("en") });
    expect(JSON.stringify(rendered)).toContain("/templates/doctor-2.1/medical-practice-hero.webp");
  });

  it("keeps contact controls localized in Arabic", () => {
    const contact = template.sections.find((section) => section.id === doctorContactId);
    expect(contact).toBeDefined();

    const rendered = contact?.render({ value: contact.defaults, context: context("ar") });
    const serialized = JSON.stringify(rendered);
    expect(serialized).toContain("اتصل بالعيادة");
    expect(serialized).toContain("ساعات العمل");
    expect(serialized).toContain("افتح الخريطة كاملة");
  });
});
