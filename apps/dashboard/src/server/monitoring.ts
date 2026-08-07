import { withTenantTransaction } from "@factory/database";
import { requireDashboardContext } from "@/server/auth";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";
import { workerStatusFromHeartbeat } from "@/server/worker-status";

export type MonitoringState = "operational" | "degraded" | "offline" | "informational";

export interface MonitoredSystem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly state: MonitoringState;
  readonly status: string;
  readonly detail: string;
  readonly checkedAt: Date;
  readonly metrics: readonly { readonly label: string; readonly value: string }[];
}

export interface MonitoringOverview {
  readonly checkedAt: Date;
  readonly systems: readonly MonitoredSystem[];
}

export async function loadMonitoringOverview(): Promise<MonitoringOverview> {
  const checkedAt = new Date();
  const context = await requireDashboardContext("website.read");
  const client = dashboardDatabase();
  const heartbeat = await client.serviceHeartbeat.findFirst({
    where: { service: "worker" },
    orderBy: { heartbeatAt: "desc" },
    select: { status: true, heartbeatAt: true, startedAt: true, instanceId: true },
  });
  const worker = workerStatusFromHeartbeat(heartbeat);
  const queueData = await withTenantTransaction(
    client,
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: "system-monitoring",
    },
    async (transaction) => {
      const jobStatuses = await transaction.job.groupBy({
        by: ["status"],
        where: { organizationId: context.organization.id },
        _count: true,
      });
      const mailStatuses = await transaction.outboundMessage.groupBy({
        by: ["status"],
        where: { organizationId: context.organization.id },
        _count: true,
      });
      const latestMail = await transaction.outboundMessage.findFirst({
        where: { organizationId: context.organization.id },
        orderBy: { createdAt: "desc" },
        select: { status: true, createdAt: true, sentAt: true, failureReason: true },
      });
      return { jobStatuses, mailStatuses, latestMail };
    },
  );

  const rendererUrl = new URL("/api/ready", dashboardConfig.FACTORY_RENDERER_PUBLIC_URL).toString();
  const templateLabUrl = localTemplateLabUrl();
  const [rendererProbe, templateLabProbe] = await Promise.all([
    probe(rendererUrl),
    templateLabUrl ? probe(templateLabUrl) : Promise.resolve(null),
  ]);
  const activeJobs = statusCount(queueData.jobStatuses, ["queued", "running", "retryable"]);
  const failedJobs = statusCount(queueData.jobStatuses, ["failed", "dead_letter"]);
  const queuedMail = statusCount(queueData.mailStatuses, ["queued", "delivering"]);
  const sentMail = statusCount(queueData.mailStatuses, ["sent"]);
  const failedMail = statusCount(queueData.mailStatuses, ["failed"]);
  const mailConfigured = Boolean(
    dashboardConfig.FACTORY_MAIL_PROVIDER_URL &&
    dashboardConfig.FACTORY_MAIL_PROVIDER_SECRET &&
    dashboardConfig.FACTORY_MAIL_FROM,
  );
  const mailState: MonitoringState =
    dashboardConfig.FACTORY_DEPLOYMENT_MODE === "production" && !mailConfigured
      ? "offline"
      : worker.state !== "online" || failedMail > 0
        ? "degraded"
        : "operational";

  return {
    checkedAt,
    systems: [
      {
        id: "dashboard",
        name: "Control Panel",
        description: "Dashboard, authentication, and management actions",
        state: "operational",
        status: "Online",
        detail: "This monitoring view was rendered successfully.",
        checkedAt,
        metrics: [{ label: "Mode", value: dashboardConfig.FACTORY_DEPLOYMENT_MODE }],
      },
      {
        id: "database",
        name: "PostgreSQL database",
        description: "Tenant data, jobs, publications, and delivery state",
        state: "operational",
        status: "Connected",
        detail: "Monitoring queries and tenant isolation completed successfully.",
        checkedAt,
        metrics: [
          { label: "Active jobs", value: String(activeJobs) },
          { label: "Failed jobs", value: String(failedJobs) },
        ],
      },
      {
        id: "worker",
        name: "Publish worker",
        description: "Publishing, lifecycle maintenance, and background processing",
        state:
          worker.state === "online"
            ? "operational"
            : worker.state === "starting" || worker.state === "stopping"
              ? "degraded"
              : "offline",
        status: workerLabel(worker.state),
        detail: heartbeat
          ? `Latest instance ${heartbeat.instanceId} reported ${heartbeat.status}.`
          : "No worker heartbeat has been recorded.",
        checkedAt: heartbeat?.heartbeatAt ?? checkedAt,
        metrics: [
          { label: "Queued / running", value: String(activeJobs) },
          { label: "Failed / dead letter", value: String(failedJobs) },
        ],
      },
      {
        id: "mail",
        name: "Email delivery",
        description: "Subscription notices and transactional client mail",
        state: mailState,
        status: mailConfigured ? "Provider configured" : "Local delivery",
        detail:
          dashboardConfig.FACTORY_DEPLOYMENT_MODE === "production" && !mailConfigured
            ? "The production mail provider is not fully configured."
            : queueData.latestMail
              ? `Latest message is ${queueData.latestMail.status}${queueData.latestMail.failureReason ? `: ${queueData.latestMail.failureReason}` : "."}`
              : "No outbound messages have been queued yet.",
        checkedAt:
          queueData.latestMail?.sentAt ??
          queueData.latestMail?.createdAt ??
          heartbeat?.heartbeatAt ??
          checkedAt,
        metrics: [
          { label: "Queued / delivering", value: String(queuedMail) },
          { label: "Sent", value: String(sentMail) },
          { label: "Failed", value: String(failedMail) },
        ],
      },
      {
        id: "renderer",
        name: "Public renderer",
        description: "Published website routing and artifact rendering",
        state: rendererProbe.ok ? "operational" : "offline",
        status: rendererProbe.ok ? "Ready" : "Unavailable",
        detail: rendererProbe.detail,
        checkedAt,
        metrics: [{ label: "Response", value: `${rendererProbe.latencyMs} ms` }],
      },
      {
        id: "templates",
        name: "Template Lab",
        description: "Template discovery and compatibility diagnostics",
        state: templateLabProbe
          ? templateLabProbe.ok
            ? "operational"
            : "offline"
          : "informational",
        status: templateLabProbe
          ? templateLabProbe.ok
            ? "Online"
            : "Not running"
          : "Development only",
        detail: templateLabProbe
          ? templateLabProbe.detail
          : "Template Lab is intentionally not probed outside local deployments.",
        checkedAt,
        metrics: templateLabProbe
          ? [{ label: "Response", value: `${templateLabProbe.latencyMs} ms` }]
          : [],
      },
      {
        id: "artifacts",
        name: "Artifact storage",
        description: "Compiled publications, previews, and generated assets",
        state: "operational",
        status:
          dashboardConfig.FACTORY_ARTIFACT_DRIVER === "s3" ? "S3 configured" : "Local storage",
        detail:
          dashboardConfig.FACTORY_ARTIFACT_DRIVER === "s3"
            ? `Using bucket ${dashboardConfig.FACTORY_S3_BUCKET ?? "configured by deployment"}.`
            : "Using the local artifact directory for development.",
        checkedAt,
        metrics: [{ label: "Driver", value: dashboardConfig.FACTORY_ARTIFACT_DRIVER }],
      },
    ],
  };
}

async function probe(url: string): Promise<{ ok: boolean; detail: string; latencyMs: number }> {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(2_500) });
    return {
      ok: response.ok,
      detail: response.ok
        ? `${new URL(url).origin} responded successfully.`
        : `${new URL(url).origin} returned HTTP ${response.status}.`,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      detail: `${new URL(url).origin} could not be reached: ${error instanceof Error ? error.message : "request failed"}`,
      latencyMs: Date.now() - startedAt,
    };
  }
}

function localTemplateLabUrl(): string | null {
  if (dashboardConfig.FACTORY_DEPLOYMENT_MODE !== "local") return null;
  const url = new URL(dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL);
  url.port = "3002";
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function statusCount(
  rows: readonly { readonly status: string; readonly _count: number }[],
  statuses: readonly string[],
): number {
  return rows.reduce((total, row) => total + (statuses.includes(row.status) ? row._count : 0), 0);
}

function workerLabel(state: string): string {
  if (state === "online") return "Online";
  if (state === "starting") return "Starting";
  if (state === "stopping") return "Stopping";
  if (state === "unhealthy") return "Unhealthy";
  return "Offline";
}
