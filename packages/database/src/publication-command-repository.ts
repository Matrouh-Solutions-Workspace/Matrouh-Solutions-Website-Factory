import { createHash, randomUUID } from "node:crypto";
import type {
  PublicationCommandContext,
  PublicationCommandRepository,
  PublicationRequestResult,
  RequestPublicationCommand,
} from "@factory/publishing";
import type { Prisma, PrismaClient } from "./generated/client/client";

export class PrismaPublicationCommandRepository implements PublicationCommandRepository {
  constructor(private readonly client: PrismaClient) {}

  requestPublication(
    context: PublicationCommandContext,
    command: RequestPublicationCommand,
  ): Promise<PublicationRequestResult | null> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT set_config('app.organization_id', ${context.organizationId}, true), set_config('app.actor_id', ${context.actorId}, true), set_config('app.correlation_id', ${context.correlationId}, true)`;
      const website = await transaction.website.findUnique({
        where: {
          organizationId_id: {
            organizationId: context.organizationId,
            id: command.websiteId,
          },
        },
        select: { id: true, draftRevision: true, templateId: true, templateVersion: true },
      });
      if (!website) return null;

      const revision = website.draftRevision.toString();
      const scope = "publication.request";
      const logicalKey = `${website.id}:${revision}`;
      const keyHash = digest(`${scope}\0${logicalKey}`);
      const requestHash = digest(
        JSON.stringify({
          websiteId: website.id,
          requestedDraftRevision: revision,
          templateId: website.templateId,
          templateVersion: website.templateVersion,
        }),
      );
      const idempotencyId = randomUUID();
      const proposedJobId = randomUUID();
      const record = await transaction.idempotencyRecord.upsert({
        where: {
          organizationId_scope_keyHash: {
            organizationId: context.organizationId,
            scope,
            keyHash,
          },
        },
        update: {},
        create: {
          id: idempotencyId,
          organizationId: context.organizationId,
          scope,
          keyHash,
          requestHash,
          status: "processing",
          resourceId: proposedJobId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
        },
      });

      if (record.requestHash !== requestHash) throw new Error("IDEMPOTENCY_REQUEST_CONFLICT");
      if (record.id !== idempotencyId) {
        if (!record.resourceId) throw new Error("IDEMPOTENCY_RESOURCE_MISSING");
        return { jobId: record.resourceId, created: false, draftRevision: revision };
      }

      const correlationId = `publish-website:${website.id}:${revision}`;
      const deduplicationKey = `publication.requested:${logicalKey}`;
      const payload = json({
        websiteId: website.id,
        requestedDraftRevision: revision,
        templateId: website.templateId,
        templateVersion: website.templateVersion,
      });
      await transaction.job.create({
        data: {
          id: proposedJobId,
          organizationId: context.organizationId,
          type: "publication.requested",
          version: 1,
          payloadJson: payload,
          status: "queued",
          priority: 10,
          deduplicationKey,
          correlationId,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organizationId,
          eventType: "PublicationRequested",
          eventVersion: 1,
          aggregateType: "website",
          aggregateId: website.id,
          aggregateRevision: website.draftRevision,
          payloadJson: json({ websiteId: website.id, jobId: proposedJobId }),
          correlationId,
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organizationId,
          actorType: "user",
          actorId: context.actorId,
          action: "publication.requested",
          resourceType: "website",
          resourceId: website.id,
          correlationId,
          metadataJson: json({ jobId: proposedJobId, draftRevision: revision }),
          retentionClass: "standard",
        },
      });
      await transaction.idempotencyRecord.update({
        where: { id: idempotencyId },
        data: {
          status: "completed",
          responseJson: json({ jobId: proposedJobId, draftRevision: revision }),
          completedAt: new Date(),
        },
      });
      return { jobId: proposedJobId, created: true, draftRevision: revision };
    });
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
