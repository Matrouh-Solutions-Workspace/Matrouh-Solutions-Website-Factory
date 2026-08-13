import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MATROUH_EMAIL,
  MATROUH_EMAIL_URL,
  MATROUH_FACEBOOK_URL,
  MATROUH_WHATSAPP_NUMBER,
  MATROUH_WHATSAPP_URL,
} from "../src/app/public-contact-links";

describe("Matrouh public contact links", () => {
  it("uses the official WhatsApp, Facebook, and email destinations", () => {
    expect(MATROUH_WHATSAPP_URL).toBe("https://wa.me/201284289997");
    expect(MATROUH_WHATSAPP_NUMBER).toBe("+20 128 428 9997");
    expect(MATROUH_FACEBOOK_URL).toBe("https://www.facebook.com/profile.php?id=61579513893446");
    expect(MATROUH_EMAIL).toBe("matrouhsolutions@gmail.com");
    expect(MATROUH_EMAIL_URL).toBe("mailto:matrouhsolutions@gmail.com");
  });

  it("connects the shared destinations to the landing page and public catalog", async () => {
    const [landing, catalog] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/matrouh-solutions/landing.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/app/templates/page.tsx"), "utf8"),
    ]);

    expect(landing).toContain("MATROUH_WHATSAPP_URL");
    expect(landing).toContain("MATROUH_FACEBOOK_URL");
    expect(landing).toContain("MATROUH_EMAIL_URL");
    expect(landing).toContain('<strong dir="ltr">WhatsApp · {MATROUH_WHATSAPP_NUMBER}</strong>');
    expect(landing).toContain('<strong dir="ltr">{MATROUH_WHATSAPP_NUMBER}</strong>');
    expect(landing).toContain('<strong dir="ltr">{MATROUH_EMAIL}</strong>');
    expect(catalog).toContain("MATROUH_WHATSAPP_URL");
    expect(catalog).toContain("MATROUH_FACEBOOK_URL");
    expect(catalog).toContain("MATROUH_EMAIL_URL");
  });
});
