import { describe, expect, it } from "vitest";
import {
  attribute,
  mediaUrl,
  presentationTokens,
  productPrice,
  storefrontKind,
  unitPrice,
} from "../src/app/storefront/presentation";

describe("storefront presentation helpers", () => {
  it("resolves kind and product values", () => {
    expect(storefrontKind("component-pc")).toBe("pc");
    const product = {
      priceMinor: 100,
      salePriceMinor: 80,
      attributes: { brand: "Acme" },
      variants: [],
    } as never;
    expect(productPrice(product)).toBe(80);
    expect(attribute(product, "brand")).toBe("Acme");
    expect(storefrontKind("hardware-store")).toBe("hardware");
    expect(storefrontKind("fashion-store")).toBe("fashion");
    expect(productPrice({ ...product, salePriceMinor: null })).toBe(100);
    expect(attribute({ ...product, attributes: { count: 2 } }, "count")).toBe("2");
    expect(attribute({ ...product, attributes: { active: true } }, "active")).toBe("true");
    expect(attribute({ ...product, attributes: { nested: {} } }, "nested")).toBe("");
  });
  it("builds media URLs", () => {
    expect(mediaUrl("org", "media/logo.png")).toBe("/factory-media/org/logo.png");
  });

  it("resolves variant prices through each fallback", () => {
    const product = { priceMinor: 100, salePriceMinor: 80, attributes: {}, variants: [] } as never;
    expect(unitPrice(product, { salePriceMinor: 50, priceMinor: 60 } as never)).toBe(50);
    expect(unitPrice(product, { salePriceMinor: null, priceMinor: 60 } as never)).toBe(60);
    expect(unitPrice(product, { salePriceMinor: null, priceMinor: null } as never)).toBe(80);
    expect(
      unitPrice({ ...product, salePriceMinor: null }, {
        salePriceMinor: null,
        priceMinor: null,
      } as never),
    ).toBe(100);
  });

  it("creates customizable presentation tokens with safe defaults", () => {
    expect(
      presentationTokens({
        tokens: { primary: "#111", accent: "#222", surface: "#333", radius: "4px" },
      }),
    ).toMatchObject({
      "--commerce-primary": "#111",
      "--commerce-accent": "#222",
      "--commerce-surface": "#333",
      "--commerce-radius": "4px",
    });
    expect(presentationTokens({ tokens: [] })).toMatchObject({
      "--commerce-primary": "#171512",
      "--commerce-accent": "#a45f3f",
      "--commerce-surface": "#f8f6f1",
      "--commerce-radius": "18px",
    });
    expect(
      presentationTokens({ tokens: { primary: 1, accent: null, surface: true, radius: 8 } }),
    ).toMatchObject({
      "--commerce-primary": "#171512",
      "--commerce-accent": "#a45f3f",
      "--commerce-surface": "#f8f6f1",
      "--commerce-radius": "18px",
    });
  });
});
