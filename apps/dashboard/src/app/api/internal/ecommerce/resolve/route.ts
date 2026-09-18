import { NextResponse, type NextRequest } from "next/server";
import { normalizeHostname } from "@factory/domains";
import { dashboardDatabase } from "@/server/database";

export const dynamic = "force-dynamic";

/** Resolve a storefront using the same primary database that owns its dashboard record. */
export async function GET(request: NextRequest) {
  const hostname = normalizeHostname(request.nextUrl.searchParams.get("host") ?? "");
  if (!hostname) {
    return NextResponse.json(
      { commerce: false },
      { status: 400, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
  const rows = await dashboardDatabase().$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM resolve_active_ecommerce_store(${hostname})
    ) AS "exists"
  `;
  return NextResponse.json(
    { commerce: rows[0]?.exists === true },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
