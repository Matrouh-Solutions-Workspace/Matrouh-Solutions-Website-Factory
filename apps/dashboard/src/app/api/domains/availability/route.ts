import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireDashboardContext } from "@/server/auth";
import { dashboardDatabase } from "@/server/database";
import { hostedHostname, localHostname } from "@/server/local-hostnames";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = await requireDashboardContext("website.create");
  const hostingDomainId = request.nextUrl.searchParams.get("hostingDomainId")?.trim();
  const hostingDomain = hostingDomainId
    ? await dashboardDatabase().hostingDomain.findFirst({
        where: { id: hostingDomainId, organizationId: context.organization.id },
        select: { hostnameNormalized: true },
      })
    : null;
  if (hostingDomainId && !hostingDomain) {
    return NextResponse.json({ available: false }, { status: 400 });
  }
  const requestedHostname = request.nextUrl.searchParams.get("hostname") ?? "";
  const hostname = hostingDomain
    ? hostedHostname(requestedHostname, hostingDomain.hostnameNormalized)
    : localHostname(requestedHostname);
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
