import { describe, expect, it } from "vitest";
import { createMenuQrDataUrl } from "../src/app/menu-qr";

describe("menu QR generation", () => {
  it("creates a printable PNG data URL for a public menu", async () => {
    const value = await createMenuQrDataUrl("https://cafe.example.com/");

    expect(value).toMatch(/^data:image\/png;base64,/);
    expect(value.length).toBeGreaterThan(1_000);
  });

  it("rejects non-web protocols", async () => {
    await expect(createMenuQrDataUrl("javascript:alert(1)")).rejects.toThrow(
      "MENU_QR_URL_PROTOCOL_UNSUPPORTED",
    );
  });
});
