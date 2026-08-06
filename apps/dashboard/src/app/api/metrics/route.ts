import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const secret = dashboardConfig.FACTORY_METRICS_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied || !safeEqual(secret, supplied)) {
    return new Response("Not found", { status: 404 });
  }
  const [jobs, publications, activeWorkers] = await Promise.all([
    dashboardDatabase().job.groupBy({ by: ["status"], _count: { _all: true } }),
    dashboardDatabase().publication.groupBy({ by: ["status"], _count: { _all: true } }),
    dashboardDatabase().serviceHeartbeat.count({
      where: {
        service: "worker",
        status: "ready",
        heartbeatAt: { gte: new Date(Date.now() - 45_000) },
      },
    }),
  ]);
  const lines = [
    "# HELP factory_jobs Current jobs by lifecycle status.",
    "# TYPE factory_jobs gauge",
    ...jobs.map((item) => `factory_jobs{status="${item.status}"} ${item._count._all}`),
    "# HELP factory_publications Current publications by lifecycle status.",
    "# TYPE factory_publications gauge",
    ...publications.map(
      (item) => `factory_publications{status="${item.status}"} ${item._count._all}`,
    ),
    "# HELP factory_worker_instances Worker instances with a fresh heartbeat.",
    "# TYPE factory_worker_instances gauge",
    `factory_worker_instances ${activeWorkers}`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "cache-control": "no-store", "content-type": "text/plain; version=0.0.4" },
  });
}

function safeEqual(expected: string, supplied: string): boolean {
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}
