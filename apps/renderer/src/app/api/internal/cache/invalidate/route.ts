import { createHmac, timingSafeEqual } from "node:crypto";
import { rendererConfig } from "@/server/config";
import { invalidateHostname } from "@/server/site";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const secret = rendererConfig.FACTORY_CACHE_INVALIDATION_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  const timestamp = request.headers.get("x-factory-timestamp") ?? "";
  const signature = request.headers.get("x-factory-signature") ?? "";
  const epoch = Number(timestamp);
  if (!Number.isSafeInteger(epoch) || Math.abs(Date.now() - epoch) > 300_000) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await request.text();
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let input: unknown;
  try {
    input = JSON.parse(body) as unknown;
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return new Response("Invalid request", { status: 400 });
  }
  const payload = input as Record<string, unknown>;
  if (
    typeof payload.eventId !== "string" ||
    !Array.isArray(payload.hostnames) ||
    payload.hostnames.length > 100 ||
    payload.hostnames.some((hostname) => typeof hostname !== "string" || hostname.length > 253)
  ) {
    return new Response("Invalid request", { status: 400 });
  }
  for (const hostname of payload.hostnames as string[]) invalidateHostname(hostname);
  return Response.json({ invalidated: payload.hostnames.length, eventId: payload.eventId });
}
