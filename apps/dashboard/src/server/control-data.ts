import { withTenantTransaction } from "@factory/database";
import { requireClientAccountContext, requireDashboardContext } from "./auth";
import { dashboardDatabase } from "./database";

export async function loadClients(query = "") {
  const context = await requireDashboardContext("client.read");
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "clients-list"),
    (transaction) =>
      transaction.client.findMany({
        where: {
          organizationId: context.organization.id,
          archivedAt: null,
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" as const } },
                  { contactName: { contains: query, mode: "insensitive" as const } },
                  { contactEmail: { contains: query, mode: "insensitive" as const } },
                  { contactPhone: { contains: query, mode: "insensitive" as const } },
                  {
                    websites: {
                      some: {
                        domains: {
                          some: {
                            hostnameNormalized: { contains: query, mode: "insensitive" as const },
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { websites: true } } },
      }),
  );
}

export async function loadBillingWorkspace(query = "") {
  const context = await requireDashboardContext("website.read");
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "billing-workspace"),
    async (transaction) => {
      const websites = await transaction.website.findMany({
        where: {
          organizationId: context.organization.id,
          archivedAt: null,
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" as const } },
                  { client: { name: { contains: query, mode: "insensitive" as const } } },
                  { client: { contactEmail: { contains: query, mode: "insensitive" as const } } },
                  {
                    domains: {
                      some: {
                        hostnameNormalized: { contains: query, mode: "insensitive" as const },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
        include: {
          client: { select: { id: true, name: true } },
          subscription: true,
          domains: {
            where: { releasedAt: null },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { hostnameNormalized: true },
          },
        },
      });
      const clients = await transaction.client.findMany({
        where: { organizationId: context.organization.id, archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return { websites, clients };
    },
  );
}

export async function loadMailWorkspace() {
  const context = await requireDashboardContext("client.read");
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "mail-workspace"),
    async (transaction) => {
      const clients = await transaction.client.findMany({
        where: {
          organizationId: context.organization.id,
          archivedAt: null,
          contactEmail: { not: null },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, contactEmail: true },
      });
      const messages = await transaction.outboundMessage.findMany({
        where: { organizationId: context.organization.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          recipientEmail: true,
          subject: true,
          kind: true,
          status: true,
          createdAt: true,
          sentAt: true,
          failureReason: true,
        },
      });
      return { clients, messages };
    },
  );
}

export async function loadClientAccount() {
  const context = await requireClientAccountContext();
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "client-account"),
    async (transaction) => {
      const clients = await transaction.client.findMany({
        where: {
          organizationId: context.organization.id,
          archivedAt: null,
          contactEmail: { equals: context.actor.email, mode: "insensitive" },
        },
        orderBy: { createdAt: "asc" },
        include: {
          websites: {
            where: { archivedAt: null },
            orderBy: { name: "asc" },
            include: {
              subscription: true,
              domains: {
                where: { releasedAt: null },
                orderBy: { createdAt: "asc" },
                take: 1,
                select: { hostnameNormalized: true, status: true },
              },
            },
          },
        },
      });
      return { clients, actor: context.actor, organization: context.organization };
    },
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
      const hostingDomains = await transaction.hostingDomain.findMany({
        where: { organizationId: context.organization.id },
        orderBy: [{ isDefault: "desc" }, { hostnameNormalized: "asc" }],
      });
      return {
        websites,
        domains,
        hostingDomains: hostingDomains.map((domain) => ({
          ...domain,
          hostedWebsiteCount: domains.filter(
            (mapping) =>
              mapping.hostnameNormalized === domain.hostnameNormalized ||
              mapping.hostnameNormalized.endsWith(`.${domain.hostnameNormalized}`),
          ).length,
        })),
      };
    },
  );
}

export async function loadHostingDomainChoices() {
  const context = await requireDashboardContext("website.create");
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, "hosting-domain-choices"),
    async (transaction) => {
      const domains = await transaction.hostingDomain.findMany({
        where: { organizationId: context.organization.id },
        orderBy: [{ isDefault: "desc" }, { hostnameNormalized: "asc" }],
      });
      const mappings = await transaction.domain.findMany({
        where: { organizationId: context.organization.id, releasedAt: null },
        select: { hostnameNormalized: true },
      });
      return domains.map((domain) => ({
        ...domain,
        hostedWebsiteCount: mappings.filter(
          (mapping) =>
            mapping.hostnameNormalized === domain.hostnameNormalized ||
            mapping.hostnameNormalized.endsWith(`.${domain.hostnameNormalized}`),
        ).length,
      }));
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
