import { describe, expect, it } from "vitest";
import {
  assertOrderTransition,
  calculateCouponDiscount,
  effectivePrice,
  lineTotal,
  normalizeCouponCode,
  normalizeStoreSlug,
  orderSubtotal,
} from "./index";

describe("commerce pricing", () => {
  it("keeps all arithmetic in integer minor units", () => {
    expect(lineTotal({ unitPriceMinor: 1299, quantity: 3, discountMinor: 97 })).toBe(3800);
    expect(
      orderSubtotal([
        { unitPriceMinor: 1299, quantity: 3 },
        { unitPriceMinor: 500, quantity: 2 },
      ]),
    ).toBe(4897);
    expect(effectivePrice(1200, 900)).toBe(900);
  });

  it("applies percentage coupons in basis points and caps discounts", () => {
    const coupon = { type: "percentage" as const, value: 1250, usedCount: 0, enabled: true };
    expect(calculateCouponDiscount(coupon, 10_000)).toBe(1250);
    expect(calculateCouponDiscount({ ...coupon, value: 10_000 }, 600)).toBe(600);
  });
});

describe("commerce invariants", () => {
  it("rejects invalid lifecycle jumps", () => {
    expect(() => assertOrderTransition("pending", "confirmed")).not.toThrow();
    expect(() => assertOrderTransition("pending", "delivered")).toThrow(/Invalid order status/);
  });

  it("normalizes public identifiers", () => {
    expect(normalizeCouponCode(" summer-26 ")).toBe("SUMMER-26");
    expect(normalizeStoreSlug("  Matrouh Market! ")).toBe("matrouh-market");
  });
});
