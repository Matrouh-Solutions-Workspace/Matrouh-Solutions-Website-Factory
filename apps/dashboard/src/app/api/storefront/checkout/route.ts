import { createHash, randomBytes, randomUUID } from "node:crypto";
import { enforceRateLimit, withTenantTransaction } from "@factory/database";
import { calculateCouponDiscount, effectivePrice, normalizeCouponCode, orderSubtotal } from "@factory/ecommerce";
import {
  dashboardDatabase,
  isRecoverableDatabaseConnectionError,
  resetDashboardDatabase,
} from "@/server/database";

type CheckoutBody = {
  items?: unknown;
  customer?: unknown;
  address?: unknown;
  shippingMethodId?: unknown;
  couponCode?: unknown;
};

type ResolvedStore = { organization_id: string; store_id: string; website_id: string; currency: string };

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 64_000) return json({ error: "REQUEST_TOO_LARGE" }, 413);
  const host = request.headers.get("x-factory-site-host") ?? request.headers.get("host")?.split(":")[0] ?? "";
  if (!host) return json({ error: "STORE_NOT_FOUND" }, 404);
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).hostname.toLowerCase() !== host.toLowerCase()) {
    return json({ error: "ORIGIN_MISMATCH" }, 403);
  }

  try {
    let client = dashboardDatabase();
    try {
      await enforceRateLimit(client, `storefront-checkout:${host}:${clientAddress(request)}`, 12, 60);
    } catch (error) {
      if (!isRecoverableDatabaseConnectionError(error)) throw error;
      client = await resetDashboardDatabase();
      await enforceRateLimit(client, `storefront-checkout:${host}:${clientAddress(request)}`, 12, 60);
    }
    const body = await request.json() as CheckoutBody;
    const input = parseCheckout(body);
    let stores: ResolvedStore[];
    try {
      stores = await client.$queryRaw<ResolvedStore[]>`
        SELECT organization_id, store_id, website_id, currency
        FROM resolve_active_ecommerce_store(${host})
      `;
    } catch (error) {
      if (!isRecoverableDatabaseConnectionError(error)) throw error;
      client = await resetDashboardDatabase();
      stores = await client.$queryRaw<ResolvedStore[]>`
        SELECT organization_id, store_id, website_id, currency
        FROM resolve_active_ecommerce_store(${host})
      `;
    }
    const store = stores[0];
    if (!store) return json({ error: "STORE_NOT_FOUND" }, 404);

    const result = await withTenantTransaction(
      client,
      {
        organizationId: store.organization_id,
        actorId: "00000000-0000-0000-0000-000000000000",
        correlationId: `storefront-checkout:${store.store_id}:${randomUUID()}`,
      },
      async (transaction) => {
        const variantIds = input.items.map((item) => item.variantId);
        const variants = await transaction.ecommerceProductVariant.findMany({
          where: {
            id: { in: variantIds },
            organizationId: store.organization_id,
            active: true,
            product: {
              storeId: store.store_id,
              status: "published",
              visibility: "public",
              archivedAt: null,
            },
          },
          include: { product: { include: { translations: true } } },
        });
        if (variants.length !== variantIds.length) throw new CheckoutError("PRODUCT_UNAVAILABLE");
        const byId = new Map(variants.map((variant) => [variant.id, variant]));
        const pricedLines = input.items.map((item) => {
          const variant = byId.get(item.variantId);
          if (!variant || variant.productId !== item.productId) throw new CheckoutError("PRODUCT_UNAVAILABLE");
          if (variant.stockQuantity < item.quantity) throw new CheckoutError("INSUFFICIENT_INVENTORY");
          return {
            input: item,
            variant,
            unitPriceMinor: effectivePrice(
              variant.priceMinor ?? variant.product.basePriceMinor,
              variant.salePriceMinor ?? variant.product.salePriceMinor,
            ),
          };
        });
        const subtotalMinor = orderSubtotal(pricedLines.map((line) => ({ unitPriceMinor: line.unitPriceMinor, quantity: line.input.quantity })));
        const shipping = await transaction.ecommerceShippingMethod.findFirst({
          where: { id: input.shippingMethodId, organizationId: store.organization_id, storeId: store.store_id, enabled: true },
        });
        const offlinePayment = await transaction.ecommercePaymentMethod.findFirst({
          where: {
            organizationId: store.organization_id,
            storeId: store.store_id,
            enabled: true,
            key: { in: ["cash_on_delivery", "bank_transfer"] },
          },
          orderBy: { position: "asc" },
        });
        if (!shipping) throw new CheckoutError("SHIPPING_METHOD_UNAVAILABLE");
        if (!offlinePayment) throw new CheckoutError("OFFLINE_PAYMENT_UNAVAILABLE");

        const coupon = input.couponCode ? await transaction.ecommerceCoupon.findFirst({
          where: { storeId: store.store_id, code: input.couponCode, organizationId: store.organization_id },
        }) : null;
        const discountMinor = coupon ? calculateCouponDiscount(coupon, subtotalMinor) : 0;
        if (input.couponCode && (!coupon || discountMinor <= 0)) throw new CheckoutError("COUPON_INVALID");
        const totalMinor = subtotalMinor - discountMinor + shipping.priceMinor;
        let customer = input.customer.email ? await transaction.ecommerceCustomer.findFirst({
          where: { organizationId: store.organization_id, storeId: store.store_id, email: { equals: input.customer.email, mode: "insensitive" } },
        }) : null;
        customer ??= await transaction.ecommerceCustomer.create({
          data: {
            id: randomUUID(), organizationId: store.organization_id, storeId: store.store_id,
            name: input.customer.name, email: input.customer.email, phone: input.customer.phone,
            addressJson: input.address,
          },
        });
        const orderNumber = orderIdentifier();
        const order = await transaction.ecommerceOrder.create({
          data: {
            id: randomUUID(), organizationId: store.organization_id, storeId: store.store_id,
            customerId: customer.id, orderNumber, currency: store.currency,
            subtotalMinor, discountMinor, shippingMinor: shipping.priceMinor, totalMinor,
            customerSnapshot: input.customer, shippingAddress: input.address, billingAddress: input.address,
            notes: input.address.notes,
            items: { create: pricedLines.map((line) => ({
              id: randomUUID(), productId: line.variant.productId, variantId: line.variant.id,
              sku: line.variant.sku ?? line.variant.product.sku,
              productName: localizedProductName(line.variant.product.translations),
              variantName: line.variant.title, quantity: line.input.quantity,
              unitPriceMinor: line.unitPriceMinor, totalMinor: line.unitPriceMinor * line.input.quantity,
            })) },
            payments: { create: {
              id: randomUUID(), paymentMethodId: offlinePayment.id, status: "pending", amountMinor: totalMinor,
            } },
          },
        });
        await transaction.ecommerceCart.create({
          data: {
            id: randomUUID(), organizationId: store.organization_id, storeId: store.store_id,
            customerId: customer.id, sessionKeyHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
            status: "converted", currency: store.currency, expiresAt: new Date(),
            items: { create: pricedLines.map((line) => ({
              id: randomUUID(), productId: line.variant.productId, variantId: line.variant.id,
              quantity: line.input.quantity, unitPriceMinor: line.unitPriceMinor,
            })) },
          },
        });
        for (const line of pricedLines) {
          const updated = await transaction.ecommerceProductVariant.updateMany({
            where: { id: line.variant.id, organizationId: store.organization_id, stockQuantity: { gte: line.input.quantity } },
            data: { stockQuantity: { decrement: line.input.quantity } },
          });
          if (updated.count !== 1) throw new CheckoutError("INSUFFICIENT_INVENTORY");
          await transaction.ecommerceInventoryAdjustment.create({
            data: {
              id: randomUUID(), organizationId: store.organization_id, storeId: store.store_id,
              variantId: line.variant.id, quantityDelta: -line.input.quantity,
              reason: "order", referenceType: "order", referenceId: order.id,
            },
          });
        }
        if (coupon && discountMinor > 0) {
          await transaction.ecommerceCoupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
          await transaction.ecommerceCouponRedemption.create({
            data: { id: randomUUID(), couponId: coupon.id, orderId: order.id, discountMinor },
          });
        }
        await transaction.ecommerceAnalyticsEvent.create({
          data: {
            id: randomUUID(), organizationId: store.organization_id, storeId: store.store_id,
            eventType: "order_created", dataJson: { orderId: order.id, totalMinor },
          },
        });
        return {
          orderNumber,
          currency: store.currency,
          subtotalMinor,
          discountMinor,
          shippingMinor: shipping.priceMinor,
          totalMinor,
        };
      },
    );
    return json(result, 201);
  } catch (error) {
    if (error instanceof CheckoutError) return json({ error: error.code }, 400);
    if (error instanceof SyntaxError) return json({ error: "INVALID_JSON" }, 400);
    console.error(JSON.stringify({ service: "dashboard", event: "storefront.checkout_failed", message: error instanceof Error ? error.message : String(error) }));
    return json({
      error: "CHECKOUT_FAILED",
      ...(process.env.NODE_ENV === "development" && error instanceof Error
        ? { detail: error.message }
        : {}),
    }, 500);
  }
}

class CheckoutError extends Error {
  constructor(readonly code: string) { super(code); }
}

function parseCheckout(body: CheckoutBody) {
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) throw new CheckoutError("INVALID_CART");
  const items = body.items.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CheckoutError("INVALID_CART");
    const item = raw as Record<string, unknown>;
    if (!uuid(item.productId) || !uuid(item.variantId) || !Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 99) throw new CheckoutError("INVALID_CART");
    return { productId: item.productId, variantId: item.variantId, quantity: Number(item.quantity) };
  });
  if (new Set(items.map((item) => item.variantId)).size !== items.length) throw new CheckoutError("DUPLICATE_CART_ITEM");
  const customer = object(body.customer);
  const address = object(body.address);
  const parsedCustomer = {
    name: limited(customer.name, 200, true), email: email(customer.email), phone: limited(customer.phone, 50, true),
  };
  const parsedAddress = {
    line1: limited(address.line1, 300, true), city: limited(address.city, 160, true), notes: limited(address.notes, 1000, false),
  };
  if (!uuid(body.shippingMethodId)) throw new CheckoutError("INVALID_METHOD");
  const rawCoupon = limited(body.couponCode, 80, false);
  return {
    items, customer: parsedCustomer, address: parsedAddress,
    shippingMethodId: body.shippingMethodId,
    couponCode: rawCoupon ? normalizeCouponCode(rawCoupon) : null,
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CheckoutError("INVALID_CHECKOUT");
  return value as Record<string, unknown>;
}
function limited(value: unknown, maximum: number, required: boolean): string {
  const text = typeof value === "string" ? value.trim().slice(0, maximum) : "";
  if (required && !text) throw new CheckoutError("MISSING_CUSTOMER_DETAILS");
  return text;
}
function email(value: unknown): string | null {
  const text = limited(value, 320, false).toLowerCase();
  if (!text) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new CheckoutError("INVALID_EMAIL");
  return text;
}
function uuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value); }
function localizedProductName(translations: readonly { locale: string; name: string }[]): string { return translations.find((row) => row.locale === "en")?.name ?? translations[0]?.name ?? "Product"; }
function orderIdentifier(): string { return `MS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`; }
function clientAddress(request: Request): string { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
function json(value: unknown, status: number): Response { return Response.json(value, { status, headers: { "Cache-Control": "no-store" } }); }
