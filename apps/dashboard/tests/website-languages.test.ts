import { describe, expect, it } from "vitest";
import { websiteLanguageSelection } from "../src/server/website-languages";

describe("website language selection", () => {
  it("creates English-only and Arabic-only selections", () => {
    expect(websiteLanguageSelection("en", "ar")).toEqual({
      defaultLocale: "en",
      locales: ["en"],
    });
    expect(websiteLanguageSelection("ar", "en")).toEqual({
      defaultLocale: "ar",
      locales: ["ar"],
    });
  });

  it("supports either default for bilingual websites", () => {
    expect(websiteLanguageSelection("both", "en")).toEqual({
      defaultLocale: "en",
      locales: ["en", "ar"],
    });
    expect(websiteLanguageSelection("both", "ar")).toEqual({
      defaultLocale: "ar",
      locales: ["ar", "en"],
    });
  });

  it("rejects unsupported modes", () => {
    expect(websiteLanguageSelection("fr", "en")).toBeNull();
  });
});
