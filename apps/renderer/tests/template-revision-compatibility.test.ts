import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("compatible in-place template revisions", () => {
  it("loads the cataloged implementation while preserving the publication contract", async () => {
    const rendererSource = await readFile(resolve(process.cwd(), "src/server/site.ts"), "utf8");
    const runtimeSource = await readFile(
      resolve(process.cwd(), "../../packages/template-runtime/src/index.tsx"),
      "utf8",
    );

    expect(rendererSource).toContain("loaded.artifactHash !== version.artifact_hash");
    expect(rendererSource).toContain(
      "loaded.manifest.manifestHash !== snapshot.template.manifestHash",
    );
    expect(rendererSource).not.toContain(
      "version.artifact_hash !== snapshot.template.artifactHash",
    );
    expect(runtimeSource).not.toContain("artifact.artifactHash !== snapshot.template.artifactHash");
    expect(runtimeSource).toContain("artifact.manifestHash !== snapshot.template.manifestHash");
  });
});
