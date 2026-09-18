import { withTenantTransaction } from "@factory/database";
import { requireClientAccountContext, requireDashboardContext } from "./auth";
import { dashboardDatabase } from "./database";

interface ClientAccountRow {
  clientId: string;
  clientName: string;
  websiteId: string | null;
  websiteName: string | null;
  websiteKind: "standard" | "ecommerce" | null;
  websiteStatus: "draft" | "published" | "unpublished" | "disabled" | "archived" | null;
  subscriptionCadence: "trial" | "monthly" | "yearly" | null;
  subscriptionStatus: "active" | "expired" | "cancelled" | null;
  subscriptionExpiresAt: Date | null;
  ecommerceStoreId: string | null;
  domainHostname: string | null;
  domainStatus: string | null;
}

interface ClientAccountWebsite {
  id: string;
  name: string;
  kind: "standard" | "ecommerce";
  status: "draft" | "published" | "unpublished" | "disabled" | "archived";
  subscription: {
    cadence: "trial" | "monthly" | "yearly";
    status: "active" | "expired" | "cancelled";
    expiresAt: Date;
  } | null;
  ecommerceStore: { id: string } | null;
  domains: { hostnameNormalized: string; status: string }[];
}

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
                            kind: "subdomain",
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
                        kind: "subdomain",
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
            where: { releasedAt: null, kind: "subdomain" },
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
      // Nested Prisma includes fan out into concurrent operations on the one pg.Client
      // reserved by this interactive transaction. Read the complete account projection
      // in one statement so pg never receives an overlapping client.query() call.
      const rows = await transaction.$queryRaw<ClientAccountRow[]>`
        SELECT
          client.id AS "clientId",
          client.name AS "clientName",
          website.id AS "websiteId",
          website.name AS "websiteName",
          website.kind::text AS "websiteKind",
          website.status::text AS "websiteStatus",
          subscription.cadence::text AS "subscriptionCadence",
          subscription.status::text AS "subscriptionStatus",
          subscription.expires_at AS "subscriptionExpiresAt",
          store.id AS "ecommerceStoreId",
          domain.hostname_normalized AS "domainHostname",
          domain.status::text AS "domainStatus"
        FROM clients client
        LEFT JOIN websites website
          ON website.organization_id = client.organization_id
          AND website.client_id = client.id
          AND website.archived_at IS NULL
        LEFT JOIN website_subscriptions subscription
          ON subscription.organization_id = website.organization_id
          AND subscription.website_id = website.id
        LEFT JOIN ecommerce_stores store
          ON store.organization_id = website.organization_id
          AND store.website_id = website.id
          AND store.archived_at IS NULL
        LEFT JOIN LATERAL (
          SELECT candidate.hostname_normalized, candidate.status
          FROM domains candidate
          WHERE candidate.organization_id = website.organization_id
            AND candidate.website_id = website.id
            AND candidate.released_at IS NULL
            AND candidate.kind = 'subdomain'
          ORDER BY candidate.created_at ASC
          LIMIT 1
        ) domain ON true
        WHERE client.organization_id = ${context.organization.id}::uuid
          AND client.archived_at IS NULL
          AND lower(client.contact_email) = lower(${context.actor.email})
        ORDER BY client.created_at ASC, website.name ASC NULLS LAST
      `;
      const clients: { id: string; name: string; websites: ClientAccountWebsite[] }[] = [];
      const clientsById = new Map<string, (typeof clients)[number]>();
      for (const row of rows) {
        let client = clientsById.get(row.clientId);
        if (!client) {
          client = { id: row.clientId, name: row.clientName, websites: [] };
          clientsById.set(row.clientId, client);
          clients.push(client);
        }
        if (!row.websiteId || !row.websiteName || !row.websiteKind || !row.websiteStatus) continue;
        client.websites.push({
          id: row.websiteId,
          name: row.websiteName,
          kind: row.websiteKind,
          status: row.websiteStatus,
          subscription:
            row.subscriptionCadence && row.subscriptionStatus && row.subscriptionExpiresAt
              ? {
                  cadence: row.subscriptionCadence,
                  status: row.subscriptionStatus,
                  expiresAt: row.subscriptionExpiresAt,
                }
              : null,
          ecommerceStore: row.ecommerceStoreId ? { id: row.ecommerceStoreId } : null,
          domains:
            row.domainHostname && row.domainStatus
              ? [{ hostnameNormalized: row.domainHostname, status: row.domainStatus }]
              : [],
        });
      }
      return { clients, actor: context.actor, organization: context.organization };
    },
  );
}

export async function loadClientWebsiteManagementTarget(websiteId: string) {
  const context = await requireClientAccountContext();
  return withTenantTransaction(
    dashboardDatabase(),
    tenantContext(context, `client-website-target:${websiteId}`),
    (transaction) =>
      transaction.website.findFirst({
        where: {
          id: websiteId,
          organizationId: context.organization.id,
          archivedAt: null,
          OR: [
            {
              client: {
                archivedAt: null,
                contactEmail: { equals: context.actor.email, mode: "insensitive" },
              },
            },
            { ecommerceStore: { ownerUserId: context.actor.id } },
            {
              ecommerceStore: {
                contactEmail: { equals: context.actor.email, mode: "insensitive" },
              },
            },
          ],
        },
        select: {
          kind: true,
          ecommerceStore: { select: { id: true } },
        },
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
        where: { organizationId: context.organization.id, releasedAt: null, kind: "subdomain" },
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
        where: { organizationId: context.organization.id, releasedAt: null, kind: "subdomain" },
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
