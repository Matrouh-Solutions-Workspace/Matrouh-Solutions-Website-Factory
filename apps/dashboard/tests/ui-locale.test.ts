import { describe, expect, it } from "vitest";
import { uiLocale } from "../src/server/ui-locale";

describe("uiLocale", () => {
  it("keeps English only when it is explicitly selected", () => {
    expect(uiLocale("en")).toBe("en");
  });

  it("defaults missing and unsupported values to Arabic", () => {
    expect(uiLocale(undefined)).toBe("ar");
    expect(uiLocale(null)).toBe("ar");
    expect(uiLocale("fr")).toBe("ar");
  });
});
