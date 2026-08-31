export interface CheckoutCustomer {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
}

export interface CheckoutAddress {
  readonly line1: string;
  readonly city: string;
  readonly notes: string;
}

export interface CheckoutRequest {
  readonly customer: CheckoutCustomer;
  readonly address: CheckoutAddress;
  readonly couponCode: string;
  readonly shippingMethodId: string;
}

export interface CheckoutResult {
  readonly orderNumber: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly shippingMinor: number;
  readonly totalMinor: number;
}

function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function readCheckoutRequest(form: FormData): CheckoutRequest {
  return {
    customer: {
      name: formText(form, "name"),
      email: formText(form, "email"),
      phone: formText(form, "phone"),
    },
    address: {
      line1: formText(form, "line1"),
      city: formText(form, "city"),
      notes: formText(form, "notes"),
    },
    couponCode: formText(form, "couponCode"),
    shippingMethodId: formText(form, "shippingMethodId"),
  };
}

export function parseCheckoutResult(value: unknown): CheckoutResult | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Partial<CheckoutResult>;
  return typeof result.orderNumber === "string" &&
    result.orderNumber.length > 0 &&
    Number.isSafeInteger(result.subtotalMinor) &&
    Number.isSafeInteger(result.discountMinor) &&
    Number.isSafeInteger(result.shippingMinor) &&
    Number.isSafeInteger(result.totalMinor)
    ? (result as CheckoutResult)
    : null;
}
