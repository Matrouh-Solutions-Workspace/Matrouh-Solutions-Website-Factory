import { describe, expect, it } from "vitest";
import { addCartLine, isCartLine, updateCartQuantity } from "../src/app/storefront/cart";

describe("storefront cart", () => {
  it("adds new lines, preserves unrelated lines, and rejects unavailable stock", () => {
    const cart = [{ productId: "other", variantId: "other-v", quantity: 1 }] as const;

    expect(addCartLine(cart, "p", "v", 0)).toBe(cart);
    expect(addCartLine(cart, "p", "v", 3)).toEqual([
      ...cart,
      { productId: "p", variantId: "v", quantity: 1 },
    ]);
    expect(
      addCartLine([...cart, { productId: "p", variantId: "v", quantity: 1 }], "p", "v", 3),
    ).toEqual([...cart, { productId: "p", variantId: "v", quantity: 2 }]);
  });

  it("caps additions at available stock and removes zero quantities", () => {
    const added = addCartLine([{ productId: "p", variantId: "v", quantity: 2 }], "p", "v", 2);
    expect(added).toEqual([{ productId: "p", variantId: "v", quantity: 2 }]);
    expect(updateCartQuantity(added, "v", 0)).toEqual([]);
    expect(
      updateCartQuantity(
        [
          { productId: "p", variantId: "v", quantity: 1 },
          { productId: "other", variantId: "other-v", quantity: 2 },
        ],
        "v",
        150,
      ),
    ).toEqual([
      { productId: "p", variantId: "v", quantity: 99 },
      { productId: "other", variantId: "other-v", quantity: 2 },
    ]);
  });

  it("validates persisted cart lines", () => {
    expect(isCartLine({ productId: "p", variantId: "v", quantity: 1 })).toBe(true);
    expect(isCartLine({ productId: "p", quantity: 0 })).toBe(false);
    expect(isCartLine(null)).toBe(false);
    expect(isCartLine("line")).toBe(false);
    expect(isCartLine({ productId: 1, variantId: "v", quantity: 1 })).toBe(false);
    expect(isCartLine({ productId: "p", variantId: 1, quantity: 1 })).toBe(false);
    expect(isCartLine({ productId: "p", variantId: "v", quantity: "1" })).toBe(false);
    expect(isCartLine({ productId: "p", variantId: "v", quantity: 1.5 })).toBe(false);
  });
});
