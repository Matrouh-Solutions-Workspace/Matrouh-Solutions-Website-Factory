import { formatMoney } from "@factory/ecommerce";

export interface WhatsAppOrderLine {
  readonly name: string;
  readonly variant: string;
  readonly sku: string | null;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly totalMinor: number;
}

export interface WhatsAppOrderDetails {
  readonly locale: "en" | "ar";
  readonly currency: string;
  readonly storeName: string;
  readonly storefrontUrl: string;
  readonly orderNumber: string;
  readonly customer: {
    readonly name: string;
    readonly phone: string;
    readonly email: string;
  };
  readonly address: {
    readonly line1: string;
    readonly city: string;
    readonly notes: string;
  };
  readonly shipping: {
    readonly name: string;
    readonly priceMinor: number;
  };
  readonly couponCode: string;
  readonly lines: readonly WhatsAppOrderLine[];
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly totalMinor: number;
}

export function normalizeWhatsAppNumber(value: string | null): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

export function buildWhatsAppOrderUrl(
  phone: string | null,
  order: WhatsAppOrderDetails,
): string | null {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppOrderMessage(order))}`;
}

export function buildWhatsAppContactUrl(phone: string | null): string | null {
  const number = normalizeWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}` : null;
}

export function buildWhatsAppOrderMessage(order: WhatsAppOrderDetails): string {
  const money = (minor: number) => formatMoney(minor, order.currency, order.locale);
  const optional = (value: string) => value || (order.locale === "ar" ? "غير مضاف" : "Not provided");
  const itemLines = order.lines.flatMap((line, index) => [
    `*${index + 1}. ${line.name}*`,
    `${order.locale === "ar" ? "الخيار" : "Variant"}: ${line.variant}`,
    `${order.locale === "ar" ? "الكود" : "SKU"}: ${optional(line.sku ?? "")}`,
    `${order.locale === "ar" ? "الكمية" : "Quantity"}: ${line.quantity}`,
    `${order.locale === "ar" ? "سعر الوحدة" : "Unit price"}: ${money(line.unitPriceMinor)}`,
    `${order.locale === "ar" ? "إجمالي الصنف" : "Line total"}: ${money(line.totalMinor)}`,
    "",
  ]);

  if (order.locale === "ar") {
    return [
      `مرحباً *${order.storeName}*، أود تأكيد الطلب التالي:`,
      "",
      `*رقم الطلب:* ${order.orderNumber}`,
      "",
      "*بيانات العميل*",
      `الاسم: ${order.customer.name}`,
      `الهاتف: ${order.customer.phone}`,
      `البريد الإلكتروني: ${optional(order.customer.email)}`,
      "",
      "*المنتجات*",
      ...itemLines,
      "*بيانات التوصيل*",
      `العنوان: ${order.address.line1}`,
      `المدينة: ${order.address.city}`,
      `طريقة التوصيل: ${order.shipping.name}`,
      `رسوم التوصيل: ${money(order.shipping.priceMinor)}`,
      `ملاحظات: ${optional(order.address.notes)}`,
      "",
      "*ملخص الطلب*",
      `المجموع الفرعي: ${money(order.subtotalMinor)}`,
      `الخصم: ${money(order.discountMinor)}`,
      `كود الخصم: ${optional(order.couponCode)}`,
      `*الإجمالي النهائي: ${money(order.totalMinor)}*`,
      "",
      `رابط المتجر: ${order.storefrontUrl}`,
      "يرجى تأكيد التوفر وموعد التوصيل وطريقة الدفع.",
    ].join("\n");
  }

  return [
    `Hello *${order.storeName}*, I would like to confirm this order:`,
    "",
    `*Order number:* ${order.orderNumber}`,
    "",
    "*Customer details*",
    `Name: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    `Email: ${optional(order.customer.email)}`,
    "",
    "*Items*",
    ...itemLines,
    "*Delivery details*",
    `Address: ${order.address.line1}`,
    `City: ${order.address.city}`,
    `Delivery method: ${order.shipping.name}`,
    `Delivery fee: ${money(order.shipping.priceMinor)}`,
    `Notes: ${optional(order.address.notes)}`,
    "",
    "*Order summary*",
    `Subtotal: ${money(order.subtotalMinor)}`,
    `Discount: ${money(order.discountMinor)}`,
    `Promo code: ${optional(order.couponCode)}`,
    `*Final total: ${money(order.totalMinor)}*`,
    "",
    `Storefront: ${order.storefrontUrl}`,
    "Please confirm availability, delivery time, and payment arrangement.",
  ].join("\n");
}
