import { describe, expect, it } from "vitest";
import { parseCheckoutResult, readCheckoutRequest } from "../src/app/storefront/checkout";

describe("storefront checkout", () => {
  it("reads normalized request fields", () => {
    const form = new FormData();
    form.set("name", " Ahmed ");
    form.set("shippingMethodId", "standard");
    expect(readCheckoutRequest(form)).toMatchObject({
      customer: { name: "Ahmed", email: "", phone: "" },
      shippingMethodId: "standard",
    });

    form.set("notes", new Blob(["attachment"]));
    expect(readCheckoutRequest(form).address.notes).toBe("");
  });

  it("accepts complete checkout results only", () => {
    expect(
      parseCheckoutResult({
        orderNumber: "O-1",
        subtotalMinor: 1,
        discountMinor: 0,
        shippingMinor: 2,
        totalMinor: 3,
      }),
    ).toMatchObject({ orderNumber: "O-1" });
    expect(parseCheckoutResult({ orderNumber: "O-1", totalMinor: 3 })).toBeNull();
    expect(parseCheckoutResult(null)).toBeNull();
    expect(parseCheckoutResult("result")).toBeNull();
    expect(
      parseCheckoutResult({
        orderNumber: "",
        subtotalMinor: 1,
        discountMinor: 0,
        shippingMinor: 2,
        totalMinor: 3,
      }),
    ).toBeNull();
    expect(
      parseCheckoutResult({
        orderNumber: "O-2",
        subtotalMinor: 1.5,
        discountMinor: 0,
        shippingMinor: 2,
        totalMinor: 3,
      }),
    ).toBeNull();
  });
});
