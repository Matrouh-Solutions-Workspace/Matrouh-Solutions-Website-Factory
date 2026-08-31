"use server";

import { randomUUID } from "node:crypto";
import { withTenantTransaction } from "@factory/database";
import type { JsonValue } from "@factory/template-sdk";
import type { DashboardContext } from "../auth";
import { dashboardDatabase } from "../database";

/** Creates a tenant-scoped media folder and its audit event as one transaction. */
export async function createMediaFolder(context: DashboardContext, name: string): Promise<void> {
  const folderId = randomUUID();
  const correlationId = `create-media-folder:${folderId}`;
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId,
    },
    async (transaction) => {
      await transaction.mediaFolder.create({
        data: {
          id: folderId,
          organizationId: context.organization.id,
          name,
          orderKey: Date.now().toString(36).padStart(12, "0"),
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "media.folder_created",
          resourceType: "media_folder",
          resourceId: folderId,
          correlationId,
          metadataJson: { name } as JsonValue,
          retentionClass: "standard",
        },
      });
    },
  );
}
