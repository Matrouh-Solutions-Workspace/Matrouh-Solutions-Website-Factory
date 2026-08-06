import { withTenantTransaction } from "@factory/database";
import { requireDashboardContext } from "./auth";
import { dashboardDatabase } from "./database";

export async function loadClients() {
  const context = await requireDashboardContext("client.read");
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "clients-list"),
    (transaction) =>
      transaction.client.findMany({
        where: { organizationId: context.organization.id, archivedAt: null },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { websites: true } } },
      }),
  );
}

export async function loadDomainsWorkspace() {
  const context = await requireDashboardContext("domain.read");
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "domains-list"),
    async (transaction) => {
      const websites = await transaction.website.findMany({
        where: { organizationId: context.organization.id, archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      const domains = await transaction.domain.findMany({
        where: { organizationId: context.organization.id, releasedAt: null },
        orderBy: [{ status: "asc" }, { hostnameNormalized: "asc" }],
        include: {
          website: { select: { name: true } },
          verificationAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
          certificateBindings: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
      return { websites, domains };
    },
  );
}

export async function loadMediaLibrary(filters: { query?: string; folderId?: string } = {}) {
  const context = await requireDashboardContext("media.read");
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "media-list"),
    async (transaction) => {
      const folders = await transaction.mediaFolder.findMany({
        where: { organizationId: context.organization.id, archivedAt: null },
        orderBy: [{ orderKey: "asc" }, { name: "asc" }],
      });
      const assets = await transaction.mediaAsset.findMany({
        where: {
          organizationId: context.organization.id,
          status: { not: "deleted" },
          ...(filters.folderId ? { folderId: filters.folderId } : {}),
          ...(filters.query
            ? { originalFilename: { contains: filters.query, mode: "insensitive" } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          folder: { select: { name: true } },
          _count: { select: { references: true, variants: true } },
        },
        take: 60,
      });
      return { folders, assets };
    },
  );
}

export async function loadSeoWorkspace() {
  const context = await requireDashboardContext("website.edit");
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "seo-workspace"),
    (transaction) =>
      transaction.website.findMany({
        where: { organizationId: context.organization.id, archivedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          draftRevision: true,
          pages: {
            where: { deletedAt: null },
            orderBy: [{ locale: "asc" }, { orderKey: "asc" }],
            select: {
              id: true,
              title: true,
              locale: true,
              slug: true,
              seoDrafts: {
                where: { deletedAt: null },
                orderBy: { updatedAt: "desc" },
                take: 1,
                select: { id: true, revision: true, metadataJson: true },
              },
            },
          },
        },
      }),
  );
}

export async function loadOrganizationSettings() {
  const context = await requireDashboardContext("organization.manage");
  const data = await withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "organization-settings"),
    async (transaction) => {
      const organization = await transaction.organization.findUnique({
        where: { id: context.organization.id },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          defaultLocale: true,
          planKey: true,
          revision: true,
          updatedAt: true,
        },
      });
      const memberships = await transaction.membership.count({
        where: { organizationId: context.organization.id, status: "active" },
      });
      const auditEvents = await transaction.auditEvent.findMany({
        where: { organizationId: context.organization.id },
        orderBy: { occurredAt: "desc" },
        take: 40,
        select: {
          id: true,
          actorType: true,
          actorId: true,
          action: true,
          resourceType: true,
          resourceId: true,
          correlationId: true,
          occurredAt: true,
        },
      });
      return { organization, memberships, auditEvents };
    },
  );
  return { ...data, actor: context.actor, roleKeys: context.roleKeys };
}

function tenantContext(
  context: Awaited<ReturnType<typeof requireDashboardContext>>,
  correlationId: string,
) {
  return {
    organizationId: context.organization.id,
    actorId: context.actor.id,
    correlationId,
  };
}
