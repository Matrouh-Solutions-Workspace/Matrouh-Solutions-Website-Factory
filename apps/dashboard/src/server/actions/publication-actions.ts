"use server";

import { randomUUID } from "node:crypto";
import {
  PrismaPublicationCommandRepository,
  withTenantTransaction,
} from "@factory/database";
import { requestPublication } from "@factory/publishing";
import type { JsonValue } from "@factory/template-sdk";
import type { DashboardContext } from "../auth";
import { dashboardDatabase } from "../database";
import { canReuseActivePublication } from "../publication-toggle";

function tenantActionContext(context: DashboardContext, correlationId: string) {
  return {
    organizationId: context.organization.id,
    actorId: context.actor.id,
    correlationId,
  };
}

export async function requestWebsitePublication(
  context: DashboardContext,
  websiteId: string,
  correlationId: string,
): Promise<void> {
  const client = dashboardDatabase();
  const subscriptionAllowed = await withTenantTransaction(
    client,
    tenantActionContext(context, `publish-subscription-check:${websiteId}`),
    async (transaction) => {
      const subscription = await transaction.websiteSubscription.findUnique({
        where: { organizationId_websiteId: { organizationId: context.organization.id, websiteId } },
        select: { status: true, expiresAt: true },
      });
      return !subscription || (subscription.status === "active" && subscription.expiresAt > new Date());
    },
  );
  if (!subscriptionAllowed) throw new Error("SUBSCRIPTION_EXPIRED");
  await requestPublication(
    new PrismaPublicationCommandRepository(client),
    { organizationId: context.organization.id, actorId: context.actor.id, correlationId },
    { websiteId },
  );
}

export async function queueWebsitePublication(
  context: DashboardContext,
  websiteId: string,
  options: {
    readonly correlationId: string;
    readonly publicationCorrelationId?: string;
    readonly requirePendingUpdate: boolean;
  },
): Promise<"unchanged" | "pending" | "published" | "queued" | "missing"> {
  const client = dashboardDatabase();
  const result = await withTenantTransaction(
    client,
    tenantActionContext(context, options.correlationId),
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        include: {
          subscription: true,
          activePublication: { select: { status: true, sourceDraftRevision: true } },
        },
      });
      if (!website) return "missing" as const;
      const hasPendingUpdate =
        website.status === "published" &&
        website.activePublication !== null &&
        website.activePublication.sourceDraftRevision !== website.draftRevision;
      if (options.requirePendingUpdate && !hasPendingUpdate) return "unchanged" as const;
      if (
        website.subscription &&
        (website.subscription.status !== "active" || website.subscription.expiresAt <= new Date())
      ) {
        throw new Error("SUBSCRIPTION_EXPIRED");
      }
      const activeJob = await transaction.job.findFirst({
        where: {
          organizationId: context.organization.id,
          type: "publication.requested",
          status: { in: ["queued", "running", "retryable"] },
          payloadJson: { path: ["websiteId"], equals: websiteId },
        },
        select: { id: true },
      });
      if (activeJob) return "pending" as const;
      if (
        canReuseActivePublication({
          activeStatus: website.activePublication?.status ?? null,
          activeDraftRevision: website.activePublication?.sourceDraftRevision ?? null,
          websiteDraftRevision: website.draftRevision,
        })
      ) {
        await transaction.website.update({
          where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
          data: { status: "published", revision: { increment: 1 } },
        });
        return "published" as const;
      }
      return "queued" as const;
    },
  );
  if (result === "queued") {
    await requestPublication(
      new PrismaPublicationCommandRepository(client),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: options.publicationCorrelationId ?? options.correlationId,
      },
      { websiteId },
    );
  }
  return result;
}

export async function retryWebsitePublication(
  context: DashboardContext,
  jobId: string,
): Promise<string | null> {
  const client = dashboardDatabase();
  return withTenantTransaction(
    client,
    tenantActionContext(context, `retry-publication:${jobId}`),
    async (transaction) => {
      const job = await transaction.job.findUnique({ where: { id: jobId } });
      if (
        !job ||
        job.organizationId !== context.organization.id ||
        job.type !== "publication.requested" ||
        !["failed", "dead_letter"].includes(job.status)
      )
        return null;
      const payload = job.payloadJson as Record<string, unknown>;
      const websiteId = typeof payload.websiteId === "string" ? payload.websiteId : null;
      if (!websiteId) return null;
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        select: { draftRevision: true },
      });
      if (!website) return null;
      const requestedRevision =
        typeof payload.requestedDraftRevision === "string" ? payload.requestedDraftRevision : null;
      await transaction.job.update({
        where: { id: job.id },
        data: {
          status: "queued",
          payloadJson: { ...payload, requestedDraftRevision: website.draftRevision.toString() } as JsonValue,
          availableAt: new Date(),
          completedAt: null,
          lockedAt: null,
          lockOwner: null,
          lockExpiresAt: null,
          maxAttempts: { increment: 5 },
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "publication.retry_requested",
          resourceType: "job",
          resourceId: job.id,
          correlationId: `retry-publication:${job.id}`,
          metadataJson: {
            websiteId,
            previousRequestedDraftRevision: requestedRevision,
            requestedDraftRevision: website.draftRevision.toString(),
          } as JsonValue,
          retentionClass: "standard",
        },
      });
      return websiteId;
    },
  );
}

export async function setWebsiteAvailability(
  context: DashboardContext,
  websiteId: string,
  status: "unpublished" | "disabled",
): Promise<void> {
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `website-availability:${websiteId}:${status}`),
    async (transaction) => {
      const result = await transaction.website.updateMany({
        where: { id: websiteId, organizationId: context.organization.id, archivedAt: null },
        data: { status, revision: { increment: 1 } },
      });
      if (result.count !== 1) return;
      if (status === "disabled") {
        await transaction.websiteSubscription.updateMany({
          where: {
            organizationId: context.organization.id,
            websiteId,
            disabledReason: "subscription_expired",
          },
          data: { resumeStatus: "disabled" },
        });
      }
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: `website.${status}`,
          resourceType: "website",
          resourceId: websiteId,
          correlationId: `website-availability:${websiteId}:${status}`,
          metadataJson: { status } as JsonValue,
          retentionClass: "standard",
        },
      });
    },
  );
}
