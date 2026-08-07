import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireDashboardContext } from "@/server/auth";
import { dashboardDatabase } from "@/server/database";
import { localHostname } from "@/server/local-hostnames";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await requireDashboardContext("website.create");
  const hostname = localHostname(request.nextUrl.searchParams.get("hostname") ?? "");
  if (!hostname) return NextResponse.json({ available: false }, { status: 400 });
  const existing = await dashboardDatabase().domain.findFirst({
    where: { hostnameNormalized: hostname, releasedAt: null },
    select: { id: true },
  });
  return NextResponse.json(
    { available: !existing, hostname },
    { headers: { "cache-control": "no-store" } },
  );
}
