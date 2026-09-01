import { describe, expect, it } from "vitest";
import {
  attribute,
  mediaUrl,
  productPrice,
  storefrontKind,
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
  });
  it("builds media URLs", () => {
    expect(mediaUrl("org", "media/logo.png")).toBe("/factory-media/org/logo.png");
  });
});
