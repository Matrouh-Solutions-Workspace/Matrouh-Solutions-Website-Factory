import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { platformIcons } from "../src/app/platform-icons";

describe("Matrouh Solutions favicon metadata", () => {
  it("publishes square transparent PNG icons for browser tabs and search crawlers", async () => {
    const expectedSizes = new Map([
      ["favicon-48.png", 48],
      ["icon-192.png", 192],
      ["icon-512.png", 512],
      ["apple-touch-icon.png", 180],
    ]);

    for (const [name, size] of expectedSizes) {
      const image = await readFile(resolve(process.cwd(), "public", name));
      expect(image.subarray(1, 4).toString()).toBe("PNG");
      expect(image.readUInt32BE(16)).toBe(size);
      expect(image.readUInt32BE(20)).toBe(size);
      expect(image[25]).toBe(6);
    }

    const favicon = await readFile(resolve(process.cwd(), "public", "favicon.ico"));
    expect([...favicon.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
    expect(platformIcons.icon).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: "/favicon-48.png" })]),
    );
  });
});
