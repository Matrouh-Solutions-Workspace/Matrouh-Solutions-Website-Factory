import { loadEcommerceStorefront } from "@/server/ecommerce-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = new URL(request.url).searchParams.get("host") ?? "";
  const storefront = await loadEcommerceStorefront(host);
  return Response.json(
    { commerce: storefront !== null },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
