import { describe, expect, it } from "vitest";
import { validateTemplate } from "../src/index";
describe("compatibility", () => {
  it("reports all dimensions", () => {
    const report = validateTemplate(
      {
        compatibility: {
          sdkVersion: "2.0.0",
          minimumFactoryVersion: "1.0.0",
          minimumRendererVersion: "1.0.0",
          contentSchemaVersion: 2,
          themeSchemaVersion: 2,
          publicationSnapshotVersion: 2,
        },
      } as never,
      {
        factoryVersion: "0.1.0",
        rendererVersion: "0.1.0",
        supportedSdkVersions: ["1.0.0"],
        contentSchemaVersions: [1],
        themeSchemaVersions: [1],
        publicationSnapshotVersions: [1],
      },
    );
    expect(report.checks.filter((x) => !x.valid).length).toBeGreaterThanOrEqual(6);
  });
});
