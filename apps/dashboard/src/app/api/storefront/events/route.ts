import { createHash, randomUUID } from "node:crypto";
import { enforceRateLimit, withTenantTransaction } from "@factory/database";
import { dashboardDatabase } from "@/server/database";

const allowedEvents = new Set(["page_view", "product_view", "add_to_cart", "checkout_started"]);
type ResolvedStore = { organization_id: string; store_id: string };

export async function POST(request: Request): Promise<Response> {
  const host =
    request.headers.get("x-factory-site-host") ?? request.headers.get("host")?.split(":")[0] ?? "";
  try {
    const body = (await request.json()) as { eventType?: unknown; productId?: unknown };
    if (typeof body.eventType !== "string" || !allowedEvents.has(body.eventType))
      return Response.json({ error: "INVALID_EVENT" }, { status: 400 });
    const productId =
      typeof body.productId === "string" && /^[0-9a-f-]{36}$/i.test(body.productId)
        ? body.productId
        : null;
    const client = dashboardDatabase();
    await enforceRateLimit(client, `storefront-event:${host}:${clientAddress(request)}`, 120, 60);
    const stores = await client.$queryRaw<ResolvedStore[]>`
      SELECT organization_id, store_id FROM resolve_active_ecommerce_store(${host})
    `;
    const store = stores[0];
    if (!store) return Response.json({ error: "STORE_NOT_FOUND" }, { status: 404 });
    const sessionHash = createHash("sha256")
      .update(`${clientAddress(request)}:${request.headers.get("user-agent") ?? ""}`)
      .digest("hex");
    await withTenantTransaction(
      client,
      {
        organizationId: store.organization_id,
        actorId: "00000000-0000-0000-0000-000000000000",
        correlationId: `storefront-event:${randomUUID()}`,
      },
      (transaction) =>
        transaction.ecommerceAnalyticsEvent.create({
          data: {
            id: randomUUID(),
            organizationId: store.organization_id,
            storeId: store.store_id,
            eventType: body.eventType as string,
            sessionHash,
            dataJson: productId ? { productId } : {},
          },
        }),
    );
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "EVENT_REJECTED" }, { status: 400 });
  }
}

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
