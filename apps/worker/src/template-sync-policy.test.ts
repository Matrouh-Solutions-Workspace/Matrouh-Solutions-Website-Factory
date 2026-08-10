import { describe, expect, it } from "vitest";
import { artifactIntegrityMatches, missingArtifactDisposition } from "./template-sync-policy";

describe("template catalog reconciliation policy", () => {
  it("deletes an unreferenced missing artifact", () => {
    expect(missingArtifactDisposition(0)).toBe("delete");
  });

  it("preserves referenced history in quarantine", () => {
    expect(missingArtifactDisposition(1)).toBe("quarantine");
  });

  it("rejects a changed immutable artifact hash", () => {
    expect(artifactIntegrityMatches("original", "changed")).toBe(false);
    expect(artifactIntegrityMatches("same", "same")).toBe(true);
  });
});
