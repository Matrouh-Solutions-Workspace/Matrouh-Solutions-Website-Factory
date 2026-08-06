import { randomUUID } from "node:crypto";
import { withTenantTransaction } from "@factory/database";
import { requireDashboardContext } from "@/server/auth";
import { dashboardDatabase } from "@/server/database";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const context = await requireDashboardContext("organization.manage");
  const exportedAt = new Date();
  const data = await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `organization-export:${exportedAt.toISOString()}`,
    },
    async (transaction) => {
      const organization = await transaction.organization.findUnique({
        where: { id: context.organization.id },
      });
      const clients = await transaction.client.findMany({
        where: { organizationId: context.organization.id },
      });
      const websites = await transaction.website.findMany({
        where: { organizationId: context.organization.id },
        include: {
          locales: true,
          settingsDrafts: true,
          pages: { include: { sections: true, seoDrafts: true } },
          navigationDrafts: { include: { nodes: true } },
          themeDrafts: true,
          domains: { include: { verificationAttempts: true, certificateBindings: true } },
          publications: true,
        },
      });
      const media = await transaction.mediaAsset.findMany({
        where: { organizationId: context.organization.id },
        include: { variants: true, references: true, folder: true },
      });
      const auditEvents = await transaction.auditEvent.findMany({
        where: { organizationId: context.organization.id },
        orderBy: { occurredAt: "asc" },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "organization.exported",
          resourceType: "organization",
          resourceId: context.organization.id,
          correlationId: `organization-export:${exportedAt.toISOString()}`,
          metadataJson: {},
          retentionClass: "security",
        },
      });
      return { organization, clients, websites, media, auditEvents };
    },
  );
  const body = JSON.stringify(
    { format: "matrouh-factory-organization-export", version: 1, exportedAt, ...data },
    (_key, value: unknown) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
  return new Response(body, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="factory-export-${context.organization.slug}-${exportedAt.toISOString().slice(0, 10)}.json"`,
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
