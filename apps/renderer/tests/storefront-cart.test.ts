import { describe, expect, it } from "vitest";
import { addCartLine, isCartLine, updateCartQuantity } from "../src/app/storefront/cart";

describe("storefront cart", () => {
  it("caps additions at available stock and removes zero quantities", () => {
    const added = addCartLine([{ productId: "p", variantId: "v", quantity: 2 }], "p", "v", 2);
    expect(added).toEqual([{ productId: "p", variantId: "v", quantity: 2 }]);
    expect(updateCartQuantity(added, "v", 0)).toEqual([]);
  });

  it("validates persisted cart lines", () => {
    expect(isCartLine({ productId: "p", variantId: "v", quantity: 1 })).toBe(true);
    expect(isCartLine({ productId: "p", quantity: 0 })).toBe(false);
  });
});
