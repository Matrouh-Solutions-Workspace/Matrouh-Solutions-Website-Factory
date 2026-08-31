"use server";

import { randomUUID } from "node:crypto";
import { withTenantTransaction } from "@factory/database";
import type { JsonValue } from "@factory/template-sdk";
import type { DashboardContext } from "../auth";
import { dashboardDatabase } from "../database";

/** Updates a website name and advances its draft revision atomically. */
export async function updateWebsiteIdentity(
  context: DashboardContext,
  websiteId: string,
  name: string,
): Promise<void> {
  const correlationId = `website-identity:${websiteId}`;
  await withTenantTransaction(
    dashboardDatabase(),
    { organizationId: context.organization.id, actorId: context.actor.id, correlationId },
    async (transaction) => {
      const result = await transaction.website.updateMany({
        where: { id: websiteId, organizationId: context.organization.id, archivedAt: null },
        data: { name, draftRevision: { increment: 1 }, revision: { increment: 1 } },
      });
      if (result.count !== 1) return;
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "website.identity_updated",
          resourceType: "website",
          resourceId: websiteId,
          correlationId,
          metadataJson: { name } as Exclude<JsonValue, null>,
          retentionClass: "standard",
        },
      });
    },
  );
}
