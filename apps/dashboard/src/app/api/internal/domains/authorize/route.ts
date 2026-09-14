import { NextResponse, type NextRequest } from "next/server";
import { dashboardDatabase } from "@/server/database";

export const dynamic = "force-dynamic";

/** Caddy on-demand TLS gate: certificates are issued only for active website routes. */
export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
  if (!hostname || hostname.length > 253) return new NextResponse(null, { status: 400 });
  const rows = await dashboardDatabase().$queryRaw<Array<{ allowed: boolean }>>`
    SELECT authorize_public_hostname(${hostname}) AS allowed
  `;
  return new NextResponse(null, { status: rows[0]?.allowed ? 200 : 404 });
}
