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

export async function requestMediaDeletion(
  context: DashboardContext,
  assetId: string,
): Promise<void> {
  const correlationId = `delete-media:${assetId}`;
  await withTenantTransaction(
    dashboardDatabase(),
    { organizationId: context.organization.id, actorId: context.actor.id, correlationId },
    async (transaction) => {
      const asset = await transaction.mediaAsset.findFirst({
        where: { id: assetId, organizationId: context.organization.id },
        include: { _count: { select: { references: true } } },
      });
      if (!asset || asset.status === "deleted") return;
      if (asset._count.references > 0) throw new Error("MEDIA_IN_USE");
      await transaction.mediaAsset.update({
        where: { id: asset.id },
        data: { status: "deleted", metadataJson: { deletionRequestedAt: new Date().toISOString() } as JsonValue, revision: { increment: 1 } },
      });
      await transaction.job.create({
        data: {
          id: randomUUID(), organizationId: context.organization.id, type: "media.gc", version: 1,
          payloadJson: { assetId } as JsonValue, status: "queued", priority: -5, maxAttempts: 8,
          availableAt: new Date(Date.now() + 24 * 60 * 60 * 1_000), deduplicationKey: `media.gc:${assetId}`, correlationId,
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(), organizationId: context.organization.id, actorType: "user", actorId: context.actor.id,
          action: "media.deletion_requested", resourceType: "media_asset", resourceId: asset.id, correlationId,
          metadataJson: { storageKey: asset.storageKey, gracePeriodHours: 24 } as JsonValue, retentionClass: "standard",
        },
      });
    },
  );
}
