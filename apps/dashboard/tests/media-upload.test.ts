import { describe, expect, it } from "vitest";
import {
  hasExpectedSignature,
  mediaType,
  parseMediaUploadInput,
} from "../src/server/actions/media-upload";

describe("media upload helpers", () => {
  it("validates upload metadata and size", () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1])], "logo.png", { type: "image/png" }));
    form.set("purpose", "logo");
    expect(parseMediaUploadInput(form, 10)?.purpose).toBe("logo");
    expect(parseMediaUploadInput(form, 0)).toBeNull();
  });
  it("recognizes supported types and signatures", () => {
    expect(mediaType("image/png")?.extension).toBe("png");
    expect(
      hasExpectedSignature(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png",
      ),
    ).toBe(true);
    expect(hasExpectedSignature(Buffer.from("bad"), "image/png")).toBe(false);
  });
});
