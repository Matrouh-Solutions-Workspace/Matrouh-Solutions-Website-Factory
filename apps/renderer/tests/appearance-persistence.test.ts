import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("public site appearance persistence", () => {
  it("restores and saves appearance through managed client state", async () => {
    const source = await readFile(resolve(process.cwd(), "src/app/appearance-toggle.tsx"), "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain("window.localStorage.getItem(storageKey)");
    expect(source).toContain("window.localStorage.setItem(storageKey, nextAppearance)");
    expect(source).toContain('window.addEventListener("storage", syncAcrossTabs)');
    expect(source).toContain("onClick={toggleAppearance}");
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});
