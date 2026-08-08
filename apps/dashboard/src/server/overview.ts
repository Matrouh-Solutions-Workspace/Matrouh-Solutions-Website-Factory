import { withTenantTransaction } from "@factory/database";
import { requireDashboardContext } from "./auth";
import { dashboardDatabase } from "./database";
import { workerStatusFromHeartbeat, type WorkerStatus } from "./worker-status";
import { dashboardConfig } from "./config";
export { dashboardDatabase } from "./database";

export interface DashboardWebsite {
  id: string;
  name: string;
  status: string;
  templateVersion: string;
  activePublicationId: string | null;
  pendingUpdate: boolean;
  templateId: string;
  updatedAt: Date;
  domains: readonly { hostname: string; status: string }[];
  pages: number;
  latestPublishJob: DashboardPublishJob | null;
}

export interface DashboardPublishJob {
  id: string;
  websiteId: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  createdAt: Date;
  availableAt: Date;
  completedAt: Date | null;
  requestedDraftRevision: string | null;
}

export interface DashboardOverview {
  organization: { id: string; name: string; slug: string } | null;
  stats: {
    websites: number;
    publishedWebsites: number;
    templates: number;
    activeDomains: number;
    mediaAssets: number;
    activePublishJobs: number;
    failedPublishJobs: number;
  };
  websites: readonly DashboardWebsite[];
  publishJobs: readonly DashboardPublishJob[];
  worker: WorkerStatus;
  workerRestartAvailable: boolean;
  templates: readonly {
    templateId: string;
    displayName: string;
    category: string;
    lifecycleStatus: string;
    latestVersion: string | null;
  }[];
  clients: readonly { id: string; name: string }[];
}

interface TemplateCatalogOverviewRow {
  templateId: string;
  displayName: string;
  category: string;
  lifecycleStatus: string;
  versions: { templateVersion: string }[];
}

export async function loadDashboardOverview(): Promise<DashboardOverview> {
  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.read");
  const organization = context.organization;
  // The pg adapter uses one connection and cannot safely overlap prepared queries.
  const templates = await client.templateCatalogEntry.findMany({
    orderBy: { displayName: "asc" },
    include: { versions: { orderBy: { discoveredAt: "desc" }, take: 1 } },
  });
  const workerHeartbeat = await client.serviceHeartbeat.findFirst({
    where: { service: "worker" },
    orderBy: { heartbeatAt: "desc" },
    select: { status: true, heartbeatAt: true },
  });

  const [websites, publishJobsRaw, websiteStatusCounts, activeDomains, mediaAssets, clients] =
    await withTenantTransaction(
      client,
      {
        organizationId: organization.id,
        actorId: context.actor.id,
        correlationId: "dashboard-overview",
      },
      async (transaction) => {
        // Interactive transactions use one PostgreSQL connection. Keep queries sequential so
        // the pg adapter never receives overlapping client.query calls.
        const websites = await transaction.website.findMany({
          where: { archivedAt: null },
          orderBy: { updatedAt: "desc" },
          include: {
            domains: { orderBy: { hostnameNormalized: "asc" } },
            activePublication: { select: { sourceDraftRevision: true } },
            _count: { select: { pages: true } },
          },
          take: 100,
        });
        const publishJobs = await transaction.job.findMany({
          where: {
            organizationId: organization.id,
            type: "publication.requested",
            version: 1,
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        });
        const websiteStatuses = await transaction.website.groupBy({
          by: ["status"],
          where: { archivedAt: null },
          _count: true,
        });
        const domains = await transaction.domain.count({
          where: { status: "active", releasedAt: null },
        });
        const media = await transaction.mediaAsset.count({ where: { status: "ready" } });
        const clients = await transaction.client.findMany({
          where: { organizationId: organization.id, archivedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        });
        return [websites, publishJobs, websiteStatuses, domains, media, clients] as const;
      },
    );
  const publishJobs = publishJobsRaw.flatMap(mapPublishJob);
  const latestJobByWebsite = new Map<string, DashboardPublishJob>();
  for (const job of publishJobs) {
    if (!latestJobByWebsite.has(job.websiteId)) latestJobByWebsite.set(job.websiteId, job);
  }

  const websiteTotal = websiteStatusCounts.reduce((total, item) => total + item._count, 0);
  const publishedWebsites =
    websiteStatusCounts.find((item) => item.status === "published")?._count ?? 0;

  return {
    organization: { id: organization.id, name: organization.name, slug: organization.slug },
    stats: {
      websites: websiteTotal,
      publishedWebsites,
      templates: templates.length,
      activeDomains,
      mediaAssets,
      activePublishJobs: publishJobs.filter((job) =>
        ["queued", "running", "retryable"].includes(job.status),
      ).length,
      failedPublishJobs: publishJobs.filter((job) => ["failed", "dead_letter"].includes(job.status))
        .length,
    },
    websites: websites.map((website) => ({
      id: website.id,
      name: website.name,
      status: website.status,
      templateId: website.templateId,
      templateVersion: website.templateVersion,
      activePublicationId: website.activePublicationId,
      pendingUpdate:
        website.status === "published" &&
        website.activePublication !== null &&
        website.activePublication?.sourceDraftRevision !== website.draftRevision,
      updatedAt: website.updatedAt,
      domains: website.domains.map((domain) => ({
        hostname: domain.hostnameDisplay,
        status: domain.status,
      })),
      pages: website._count.pages,
      latestPublishJob: latestJobByWebsite.get(website.id) ?? null,
    })),
    publishJobs,
    worker: workerStatusFromHeartbeat(workerHeartbeat),
    workerRestartAvailable: dashboardConfig.FACTORY_DEPLOYMENT_MODE === "local",
    templates: mapTemplates(templates),
    clients,
  };
}

function mapTemplates(templates: TemplateCatalogOverviewRow[]): DashboardOverview["templates"] {
  return templates.map((template) => ({
    templateId: template.templateId,
    displayName: template.displayName,
    category: template.category,
    lifecycleStatus: template.lifecycleStatus,
    latestVersion: template.versions[0]?.templateVersion ?? null,
  }));
}

function mapPublishJob(job: {
  id: string;
  payloadJson: unknown;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  createdAt: Date;
  availableAt: Date;
  completedAt: Date | null;
}): DashboardPublishJob[] {
  const payload = job.payloadJson;
  if (!payload || typeof payload !== "object") return [];
  const websiteId = (payload as Record<string, unknown>).websiteId;
  if (typeof websiteId !== "string") return [];
  const requestedDraftRevision = (payload as Record<string, unknown>).requestedDraftRevision;
  return [
    {
      id: job.id,
      websiteId,
      status: job.status,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      createdAt: job.createdAt,
      availableAt: job.availableAt,
      completedAt: job.completedAt,
      requestedDraftRevision:
        typeof requestedDraftRevision === "string" ? requestedDraftRevision : null,
    },
  ];
}
