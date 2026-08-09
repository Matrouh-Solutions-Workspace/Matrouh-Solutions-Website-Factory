import { describe, expect, it } from "vitest";
import { latestTemplateVersion } from "../src/server/template-versions";

describe("template versions", () => {
  it("selects the highest semantic-looking version instead of insertion order", () => {
    expect(latestTemplateVersion(["1.10.0", "2.0.0", "1.9.0"])).toBe("2.0.0");
  });

  it("returns null when no ready versions exist", () => {
    expect(latestTemplateVersion([])).toBeNull();
  });
});
