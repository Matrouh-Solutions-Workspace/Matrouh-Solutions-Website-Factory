import { describe, expect, it } from "vitest";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  buildWhatsAppContactUrl,
  normalizeWhatsAppNumber,
  type WhatsAppOrderDetails,
} from "../src/app/whatsapp-order";

const order: WhatsAppOrderDetails = {
  locale: "en",
  currency: "EGP",
  storeName: "Matrouh Forge",
  storefrontUrl: "http://tools.localhost:3000",
  orderNumber: "MS-20260813-ABCD1234",
  customer: { name: "Mona Ali", phone: "+20 100 555 0101", email: "mona@example.com" },
  address: { line1: "12 Corniche Road", city: "Matrouh", notes: "Call on arrival" },
  shipping: { name: "Standard delivery", priceMinor: 7500 },
  couponCode: "WELCOME10",
  lines: [{
    name: "Cordless drill",
    variant: "18V kit",
    sku: "DRILL-18V",
    quantity: 2,
    unitPriceMinor: 250000,
    totalMinor: 500000,
  }],
  subtotalMinor: 500000,
  discountMinor: 50000,
  totalMinor: 457500,
};

describe("WhatsApp commerce orders", () => {
  it("normalizes international WhatsApp numbers", () => {
    expect(normalizeWhatsAppNumber("+20 100 111 2200")).toBe("201001112200");
    expect(normalizeWhatsAppNumber("0020 100 111 2200")).toBe("201001112200");
    expect(normalizeWhatsAppNumber("0100")).toBeNull();
    expect(buildWhatsAppContactUrl("+20 100 111 2200")).toBe("https://wa.me/201001112200");
  });

  it("includes the full order in the prepared message", () => {
    const message = buildWhatsAppOrderMessage(order);
    for (const value of [
      order.orderNumber,
      order.customer.name,
      order.customer.phone,
      order.customer.email,
      order.address.line1,
      order.address.city,
      order.address.notes,
      order.shipping.name,
      order.couponCode,
      order.lines[0]!.name,
      order.lines[0]!.variant,
      order.lines[0]!.sku!,
      order.storefrontUrl,
      "Final total",
    ]) expect(message).toContain(value);
  });

  it("builds an encoded click-to-chat URL and supports Arabic copy", () => {
    const url = buildWhatsAppOrderUrl("+20 100 111 2200", { ...order, locale: "ar" });
    expect(url).toMatch(/^https:\/\/wa\.me\/201001112200\?text=/);
    expect(decodeURIComponent(url!.split("?text=")[1]!)).toContain("رقم الطلب");
    expect(decodeURIComponent(url!.split("?text=")[1]!)).toContain(order.lines[0]!.name);
  });
});
