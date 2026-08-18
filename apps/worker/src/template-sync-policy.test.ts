import { describe, expect, it } from "vitest";
import {
  artifactNeedsRefresh,
  artifactRevisionCompatible,
  missingArtifactDisposition,
} from "./template-sync-policy";

describe("template catalog reconciliation policy", () => {
  it("deletes an unreferenced missing artifact", () => {
    expect(missingArtifactDisposition(0)).toBe("delete");
  });

  it("preserves referenced history in quarantine", () => {
    expect(missingArtifactDisposition(1)).toBe("quarantine");
  });

  it("refreshes an enhanced artifact without requiring a new template release", () => {
    expect(artifactNeedsRefresh("original", "changed")).toBe(true);
    expect(artifactNeedsRefresh("same", "same")).toBe(false);
    expect(artifactNeedsRefresh(null, "new")).toBe(false);
  });

  it("allows only revisions that preserve the published template contract", () => {
    expect(artifactRevisionCompatible("manifest", "manifest")).toBe(true);
    expect(artifactRevisionCompatible("old", "changed")).toBe(false);
    expect(artifactRevisionCompatible(null, "manifest")).toBe(false);
  });
});
