export const SUPPORTED_STORE_LOCALES = ["en", "ar"] as const;
export type StoreLocale = (typeof SUPPORTED_STORE_LOCALES)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "partially_refunded",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type CouponInput = {
  type: "percentage" | "fixed" | "product" | "category";
  value: number;
  minimumOrderMinor?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  enabled: boolean;
};

export type PricedLine = {
  unitPriceMinor: number;
  quantity: number;
  discountMinor?: number;
};

const allowedTransitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function assertMinorAmount(value: number, field = "amount"): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative integer in minor currency units`);
  }
  return value;
}

export function lineTotal(line: PricedLine): number {
  const price = assertMinorAmount(line.unitPriceMinor, "unitPriceMinor");
  if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
    throw new RangeError("quantity must be a positive integer");
  }
  const gross = price * line.quantity;
  if (!Number.isSafeInteger(gross)) throw new RangeError("line total exceeds safe integer range");
  const discount = assertMinorAmount(line.discountMinor ?? 0, "discountMinor");
  if (discount > gross) throw new RangeError("discountMinor cannot exceed the line gross amount");
  return gross - discount;
}

export function orderSubtotal(lines: readonly PricedLine[]): number {
  return lines.reduce((total, line) => {
    const next = total + lineTotal(line);
    if (!Number.isSafeInteger(next)) throw new RangeError("order subtotal exceeds safe integer range");
    return next;
  }, 0);
}

export function calculateCouponDiscount(
  coupon: CouponInput,
  eligibleSubtotalMinor: number,
  now = new Date(),
): number {
  const subtotal = assertMinorAmount(eligibleSubtotalMinor, "eligibleSubtotalMinor");
  if (!coupon.enabled) return 0;
  if (coupon.startsAt && coupon.startsAt > now) return 0;
  if (coupon.expiresAt && coupon.expiresAt <= now) return 0;
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) return 0;
  if (coupon.minimumOrderMinor !== null && coupon.minimumOrderMinor !== undefined && subtotal < coupon.minimumOrderMinor) return 0;
  if (!Number.isSafeInteger(coupon.value) || coupon.value <= 0) throw new RangeError("coupon value must be a positive integer");

  if (coupon.type === "percentage") {
    if (coupon.value > 10000) throw new RangeError("percentage coupon uses basis points and cannot exceed 10000");
    return Math.min(subtotal, Math.floor((subtotal * coupon.value) / 10000));
  }
  return Math.min(subtotal, coupon.value);
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) throw new Error(`Invalid order status transition: ${from} -> ${to}`);
}

export function effectivePrice(basePriceMinor: number, salePriceMinor?: number | null): number {
  const base = assertMinorAmount(basePriceMinor, "basePriceMinor");
  if (salePriceMinor === null || salePriceMinor === undefined) return base;
  return Math.min(base, assertMinorAmount(salePriceMinor, "salePriceMinor"));
}

export function normalizeCouponCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(normalized)) {
    throw new Error("Coupon code must be 3-80 letters, numbers, underscores, or hyphens");
  }
  return normalized;
}

export function normalizeStoreSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  if (normalized.length < 2) throw new Error("Store slug must contain at least two letters or numbers");
  return normalized;
}

export function formatMoney(minor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    assertMinorAmount(minor) / 100,
  );
}
