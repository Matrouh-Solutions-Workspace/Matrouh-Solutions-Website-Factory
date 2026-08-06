import { dashboardDatabase } from "@/server/database";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await dashboardDatabase().$queryRaw`SELECT 1`;
    return Response.json({ status: "ready", service: "dashboard" });
  } catch (error) {
    console.error(
      JSON.stringify({
        service: "dashboard",
        event: "readiness.failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json({ status: "not_ready", service: "dashboard" }, { status: 503 });
  }
}
