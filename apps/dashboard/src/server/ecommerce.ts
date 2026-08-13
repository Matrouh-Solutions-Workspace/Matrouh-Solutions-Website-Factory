import { withTenantTransaction } from "@factory/database";
import { DashboardAuthorizationError, requireDashboardContext } from "./auth";
import { dashboardDatabase } from "./database";

interface EcommerceStoreOverviewRow {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "archived";
  ownerDisplayName: string | null;
  ownerPrimaryEmail: string | null;
  templateId: string;
  templateName: string;
  templateVersion: string;
  domains: { hostnameDisplay: string }[];
  productCount: number;
  orderCount: number;
  customerCount: number;
}

export function isCommerceAdministrator(roleKeys: readonly string[]): boolean {
  return roleKeys.some((role) => role === "owner" || role === "admin");
}

export async function requireCommerceAdministrator() {
  const context = await requireDashboardContext();
  if (!isCommerceAdministrator(context.roleKeys)) {
    throw new DashboardAuthorizationError("ecommerce.admin");
  }
  return context;
}

export async function requireEcommerceStoreContext(storeId: string, permission = "ecommerce.write") {
  const context = await requireDashboardContext();
  const administrator = isCommerceAdministrator(context.roleKeys);
  const store = await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `commerce-access:${storeId}`,
    },
    (transaction) =>
      transaction.ecommerceStore.findFirst({
        where: {
          id: storeId,
          organizationId: context.organization.id,
          archivedAt: null,
          ...(administrator ? {} : { ownerUserId: context.actor.id }),
        },
        select: { id: true, websiteId: true, ownerUserId: true, name: true, status: true },
      }),
  );
  if (!store) throw new DashboardAuthorizationError(permission);
  return { context, store, administrator } as const;
}

export async function loadEcommerceStores() {
  const context = await requireDashboardContext();
  const administrator = isCommerceAdministrator(context.roleKeys);
  const stores = await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: "commerce:list-stores",
    },
    async (transaction) => {
      // A Prisma relation include fans out into concurrent operations on the one pg.Client
      // reserved by this interactive transaction. Fetch the complete overview in one SQL
      // statement instead: no overlapping client.query calls and no latency waterfall.
      const rows = await transaction.$queryRaw<EcommerceStoreOverviewRow[]>`
        SELECT
          store.id,
          store.name,
          store.status::text AS status,
          owner.display_name AS "ownerDisplayName",
          owner.primary_email AS "ownerPrimaryEmail",
          template.id AS "templateId",
          template.name AS "templateName",
          template_version.version AS "templateVersion",
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object('hostnameDisplay', domain.hostname_display)
                ORDER BY domain.created_at ASC
              )
              FROM domains domain
              WHERE domain.organization_id = store.organization_id
                AND domain.website_id = store.website_id
                AND domain.released_at IS NULL
            ),
            '[]'::jsonb
          ) AS domains,
          (
            SELECT count(*)::integer
            FROM ecommerce_products product
            WHERE product.organization_id = store.organization_id
              AND product.store_id = store.id
              AND product.archived_at IS NULL
          ) AS "productCount",
          (
            SELECT count(*)::integer
            FROM ecommerce_orders customer_order
            WHERE customer_order.organization_id = store.organization_id
              AND customer_order.store_id = store.id
          ) AS "orderCount",
          (
            SELECT count(*)::integer
            FROM ecommerce_customers customer
            WHERE customer.organization_id = store.organization_id
              AND customer.store_id = store.id
          ) AS "customerCount"
        FROM ecommerce_stores store
        INNER JOIN ecommerce_template_versions template_version
          ON template_version.id = store.ecommerce_template_version_id
        INNER JOIN ecommerce_templates template
          ON template.id = template_version.template_id
        LEFT JOIN users owner ON owner.id = store.owner_user_id
        WHERE store.organization_id = ${context.organization.id}::uuid
          AND store.archived_at IS NULL
          AND (${administrator}::boolean OR store.owner_user_id = ${context.actor.id}::uuid)
        ORDER BY store.updated_at DESC
      `;
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        owner: row.ownerDisplayName && row.ownerPrimaryEmail
          ? { displayName: row.ownerDisplayName, primaryEmail: row.ownerPrimaryEmail }
          : null,
        templateVersion: {
          version: row.templateVersion,
          template: { id: row.templateId, name: row.templateName },
        },
        website: { domains: Array.isArray(row.domains) ? row.domains : [] },
        _count: {
          products: row.productCount,
          orders: row.orderCount,
          customers: row.customerCount,
        },
      }));
    },
  );
  return { context, administrator, stores } as const;
}

export async function loadEcommerceTemplates() {
  await requireDashboardContext();
  const client = dashboardDatabase();
  const templates = await client.ecommerceTemplate.findMany({
    orderBy: { name: "asc" },
  });
  const versions = await client.ecommerceTemplateVersion.findMany({
    where: { templateId: { in: templates.map((template) => template.id) } },
    orderBy: { createdAt: "desc" },
  });
  const versionsByTemplate = new Map<string, typeof versions>();
  for (const version of versions) {
    const templateVersions = versionsByTemplate.get(version.templateId) ?? [];
    templateVersions.push(version);
    versionsByTemplate.set(version.templateId, templateVersions);
  }
  return templates.map((template) => ({
    ...template,
    versions: versionsByTemplate.get(template.id) ?? [],
  }));
}

export async function loadEcommerceStoreDashboard(storeId: string) {
  const { context, administrator } = await requireEcommerceStoreContext(storeId, "ecommerce.read");
  const result = await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `commerce:dashboard:${storeId}`,
    },
    async (transaction) => {
      const store = await transaction.ecommerceStore.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: storeId } },
        include: {
          locales: { orderBy: { locale: "asc" } },
          templateVersion: { include: { template: true } },
          website: { include: { domains: { where: { releasedAt: null }, orderBy: { createdAt: "asc" } } } },
          paymentMethods: { orderBy: { position: "asc" } },
          shippingMethods: { orderBy: { position: "asc" } },
        },
      });
      if (!store) throw new Error("ECOMMERCE_STORE_NOT_FOUND");
      // The development pg adapter may use a single connection, so keep prepared
      // tenant queries sequential inside the transaction.
      const products = await transaction.ecommerceProduct.findMany({
          where: { organizationId: context.organization.id, storeId, archivedAt: null },
          orderBy: { updatedAt: "desc" },
          include: {
            translations: true,
            variants: { orderBy: { position: "asc" } },
            categories: { include: { category: { include: { translations: true } } } },
          },
        });
      const categories = await transaction.ecommerceCategory.findMany({
          where: { organizationId: context.organization.id, storeId },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: { translations: true, _count: { select: { products: true } } },
        });
      const orders = await transaction.ecommerceOrder.findMany({
          where: { organizationId: context.organization.id, storeId },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { items: true, payments: { include: { paymentMethod: true } } },
        });
      const customers = await transaction.ecommerceCustomer.findMany({
          where: { organizationId: context.organization.id, storeId },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { _count: { select: { orders: true } } },
        });
      const coupons = await transaction.ecommerceCoupon.findMany({
          where: { organizationId: context.organization.id, storeId },
          orderBy: { code: "asc" },
        });
      const sales = await transaction.ecommerceOrder.aggregate({
          where: {
            organizationId: context.organization.id,
            storeId,
            paymentStatus: { in: ["paid", "partially_refunded"] },
          },
          _sum: { totalMinor: true },
          _count: { _all: true },
        });
      const eventCounts = await transaction.ecommerceAnalyticsEvent.groupBy({
          by: ["eventType"],
          where: { organizationId: context.organization.id, storeId },
          _count: { _all: true },
        });
      return { store, products, categories, orders, customers, coupons, sales, eventCounts };
    },
  );
  return { ...result, context, administrator } as const;
}
