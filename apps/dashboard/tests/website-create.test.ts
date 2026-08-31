import { describe, expect, it } from "vitest";
import { parseWebsiteCreationInput } from "../src/server/actions/website-create";

describe("parseWebsiteCreationInput", () => {
  it("normalizes valid website creation fields", () => {
    const form = new FormData();
    form.set("name", "  Clinic  ");
    form.set("template", "clinic@1.0.0");
    form.set("hostname", " clinic ");
    form.set("languageMode", "both");
    form.set("defaultLanguage", "ar");
    form.set("subscriptionCadence", "yearly");
    const parsed = parseWebsiteCreationInput(form);
    expect(parsed).toMatchObject({
      name: "Clinic",
      templateKey: "clinic@1.0.0",
      cadence: "yearly",
    });
    expect(parsed?.languages).toMatchObject({ defaultLocale: "ar" });
  });

  it("rejects incomplete or unsupported selections", () => {
    const form = new FormData();
    form.set("name", "Clinic");
    expect(parseWebsiteCreationInput(form)).toBeNull();
  });
});
