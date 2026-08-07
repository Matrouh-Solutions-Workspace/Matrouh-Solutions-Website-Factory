import { createHmac, randomUUID } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { unlink } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import {
  createDatabaseClient,
  withTenantTransaction,
  type DatabaseTransaction,
} from "@factory/database";
import { domainChallengeHash, domainOwnershipChallenge } from "@factory/domains";
import { RemoteMediaProvider, type ProcessedMedia } from "@factory/media";
import { compilePublication, type DraftProjection } from "@factory/publication-compiler";
import type { JsonValue, TemplateDefinition } from "@factory/template-sdk";
import { discoverTemplates, loadTemplateArtifact } from "@factory/template-loader";
import { instantiateTemplateRuntime } from "@factory/template-runtime";
import { validateTemplate } from "@factory/template-validator";
import { renderToStaticMarkup } from "react-dom/server";
import { workerArtifactStore as artifactStore } from "./artifact-store";
import { workerConfig, workspaceRoot } from "./config";
import { subscriptionExpiredMessage, subscriptionNotice } from "./subscription-lifecycle";

const templatesRoot = resolve(workspaceRoot, workerConfig.FACTORY_TEMPLATE_DIRECTORY);
const actorId = "publication-worker";
const workerId = `${actorId}:${process.pid}:${Date.now()}`;
if (!/^[a-z0-9:.-]{1,200}$/i.test(workerId)) throw new Error("WORKER_ID_INVALID");

interface PublishPayload {
  websiteId: string;
  requestedDraftRevision?: string;
  templateId?: string;
  templateVersion?: string;
}

interface ClaimedJob {
  readonly id: string;
  readonly organizationId: string;
  readonly payloadJson: unknown;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly availableAt: Date;
  readonly correlationId: string;
  readonly type: string;
  readonly version: number;
}

interface ClaimedOutboxEvent {
  readonly id: string;
  readonly organizationId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateRevision: bigint;
  readonly payloadJson: unknown;
  readonly occurredAt: Date;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly attemptCount: number;
}

interface ExpiredPreviewArtifact {
  readonly id: string;
  readonly organizationId: string;
  readonly storageUri: string;
}

interface SubscriptionLifecycleRow {
  subscription_id: string;
  organization_id: string;
  website_id: string;
  client_id: string | null;
  cadence: "trial" | "monthly" | "yearly";
  expires_at: Date;
  website_name: string;
  recipient_email: string | null;
  subscription_status: "active" | "expired" | "cancelled";
  website_status: "draft" | "published" | "unpublished" | "disabled" | "archived";
}

interface ClaimedOutboundMessage {
  id: string;
  organization_id: string;
  website_id: string | null;
  client_id: string | null;
  recipient_email: string;
  subject: string;
  body_text: string;
  kind: string;
  attempt_count: number;
  max_attempts: number;
}

interface WebsiteForPublish {
  id: string;
  organizationId: string;
  name: string;
  templateId: string;
  templateVersion: string;
  defaultLocale: string;
  draftRevision: bigint;
  revision: bigint;
  activePublicationId: string | null;
  subscription: { status: "active" | "expired" | "cancelled"; expiresAt: Date } | null;
  locales: { locale: string; fallbackLocale: string | null }[];
  domains: { hostnameNormalized: string }[];
  settingsDrafts: { schemaVersion: number; contentJson: unknown; locale: string | null }[];
  themeDrafts: { schemaVersion: number; tokensJson: unknown; locale: string | null }[];
  seoDrafts: { pageId: string | null; locale: string | null; metadataJson: unknown }[];
  navigationDrafts: {
    definitionId: string;
    locale: string | null;
    visibilitySchemaVersion: number;
    nodes: {
      id: string;
      parentNodeId: string | null;
      nodeKind: string;
      pageId: string | null;
      labelJson: unknown;
      targetJson: unknown;
      visibilityJson: unknown;
      orderKey: string;
    }[];
  }[];
  mediaReferences: {
    asset: {
      id: string;
      storageKey: string;
      contentHash: string | null;
      variants: { variantKey: string; storageKey: string }[];
    };
  }[];
  pages: {
    id: string;
    pageTypeId: string;
    locale: string;
    title: string;
    slug: string;
    sections: {
      id: string;
      sectionTypeId: string;
      schemaVersion: number;
      contentJson: unknown;
      orderKey: string;
    }[];
  }[];
}

class PermanentJobError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

await artifactStore.ready();

const database = createDatabaseClient({
  connectionString: workerConfig.DATABASE_URL,
});
const abort = new AbortController();

process.on("SIGINT", () => abort.abort());
process.on("SIGTERM", () => abort.abort());

console.log(JSON.stringify({ service: "worker", status: "ready", workerId, pid: process.pid }));

let nextMaintenanceAt = Date.now();
let nextHeartbeatAt = 0;
try {
  while (!abort.signal.aborted) {
    try {
      if (Date.now() >= nextHeartbeatAt) {
        await recordHeartbeat("ready");
        nextHeartbeatAt = Date.now() + 15_000;
      }
      if (Date.now() >= nextMaintenanceAt) {
        await cleanupExpiredPreviews();
        await cleanupOperationalRecords();
        await processSubscriptionLifecycle();
        nextMaintenanceAt = Date.now() + 60_000;
      }

      const job = await claimJob();
      if (job) {
        await runJob(job, abort.signal);
        continue;
      }

      const event = await claimOutboxEvent();
      if (event) {
        await deliverOutboxEvent(event);
        continue;
      }

      const message = await claimOutboundMessage();
      if (message) {
        await deliverOutboundMessage(message);
        continue;
      }

      await sleep(2_000, abort.signal);
    } catch (error) {
      console.error(
        JSON.stringify({ service: "worker", event: "loop.retrying", ...errorDetails(error) }),
      );
      await sleep(2_000, abort.signal);
    }
  }
} finally {
  await recordHeartbeat("stopping").catch(() => undefined);
  await database.$disconnect();
}

async function claimOutboundMessage(): Promise<ClaimedOutboundMessage | null> {
  const messages = await database.$queryRaw<ClaimedOutboundMessage[]>`
    SELECT * FROM claim_outbound_message()
  `;
  return messages[0] ?? null;
}

async function deliverOutboundMessage(message: ClaimedOutboundMessage): Promise<void> {
  try {
    const endpoint = workerConfig.FACTORY_MAIL_PROVIDER_URL;
    const secret = workerConfig.FACTORY_MAIL_PROVIDER_SECRET;
    const from = workerConfig.FACTORY_MAIL_FROM;
    if (endpoint && secret && from) {
      const body = JSON.stringify({
        messageId: message.id,
        from,
        to: message.recipient_email,
        subject: message.subject,
        text: message.body_text,
      });
      const timestamp = String(Date.now());
      const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-factory-signature": signature,
          "x-factory-timestamp": timestamp,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`MAIL_PROVIDER_FAILED_${response.status}`);
    } else if (workerConfig.FACTORY_DEPLOYMENT_MODE === "production") {
      throw new Error("MAIL_PROVIDER_NOT_CONFIGURED");
    } else {
      console.log(
        JSON.stringify({
          service: "worker",
          event: "mail.local_delivery",
          messageId: message.id,
          recipient: message.recipient_email,
          subject: message.subject,
        }),
      );
    }
    await withTenantTransaction(
      database,
      {
        organizationId: message.organization_id,
        actorId,
        correlationId: `mail-delivered:${message.id}`,
      },
      (transaction) =>
        transaction.outboundMessage.update({
          where: { id: message.id },
          data: { status: "sent", sentAt: new Date(), failureReason: null },
        }),
    );
  } catch (error) {
    const exhausted = message.attempt_count >= message.max_attempts;
    await withTenantTransaction(
      database,
      {
        organizationId: message.organization_id,
        actorId,
        correlationId: `mail-failed:${message.id}`,
      },
      (transaction) =>
        transaction.outboundMessage.update({
          where: { id: message.id },
          data: {
            status: exhausted ? "failed" : "queued",
            availableAt: new Date(Date.now() + retryDelay(message.attempt_count)),
            failureReason: error instanceof Error ? error.message.slice(0, 2_000) : "MAIL_FAILED",
          },
        }),
    );
  }
}

async function processSubscriptionLifecycle(): Promise<void> {
  const subscriptions = await database.$queryRaw<SubscriptionLifecycleRow[]>`
    SELECT * FROM list_subscription_lifecycle()
  `;
  const now = new Date();
  for (const subscription of subscriptions) {
    const millisecondsRemaining = subscription.expires_at.getTime() - now.getTime();
    if (millisecondsRemaining <= 0) {
      const expirationMessage = subscriptionExpiredMessage({
        cadence: subscription.cadence,
        expiresAt: subscription.expires_at,
        recipientEmail: subscription.recipient_email,
        websiteName: subscription.website_name,
      });
      await withTenantTransaction(
        database,
        {
          organizationId: subscription.organization_id,
          actorId,
          correlationId: `subscription-expired:${subscription.subscription_id}`,
        },
        async (transaction) => {
          const expired = await transaction.websiteSubscription.updateMany({
            where: { id: subscription.subscription_id, status: "active", expiresAt: { lte: now } },
            data: {
              status: "expired",
              disabledAt: now,
              disabledReason: "subscription_expired",
              resumeStatus: subscription.website_status,
            },
          });
          if (expired.count !== 1) return;
          await transaction.website.updateMany({
            where: {
              id: subscription.website_id,
              organizationId: subscription.organization_id,
              status: { not: "archived" },
            },
            data: { status: "disabled", revision: { increment: 1 } },
          });
          if (expirationMessage) {
            await transaction.outboundMessage.upsert({
              where: {
                websiteId_kind: {
                  websiteId: subscription.website_id,
                  kind: expirationMessage.kind,
                },
              },
              create: {
                id: randomUUID(),
                organizationId: subscription.organization_id,
                websiteId: subscription.website_id,
                clientId: subscription.client_id,
                recipientEmail: expirationMessage.recipientEmail,
                kind: expirationMessage.kind,
                subject: expirationMessage.subject,
                bodyText: expirationMessage.bodyText,
              },
              update: {},
            });
          }
        },
      );
      continue;
    }
    const notice = subscriptionNotice(subscription.cadence, millisecondsRemaining);
    const recipientEmail = subscription.recipient_email?.trim().toLowerCase();
    if (!notice || !recipientEmail) continue;
    await withTenantTransaction(
      database,
      {
        organizationId: subscription.organization_id,
        actorId,
        correlationId: `subscription-notice:${subscription.subscription_id}:${notice.key}`,
      },
      async (transaction) => {
        const messageKind = `subscription.expiry.${subscription.expires_at.getTime()}.${notice.key}`;
        await transaction.outboundMessage.upsert({
          where: {
            websiteId_kind: { websiteId: subscription.website_id, kind: messageKind },
          },
          create: {
            id: randomUUID(),
            organizationId: subscription.organization_id,
            websiteId: subscription.website_id,
            clientId: subscription.client_id,
            recipientEmail,
            kind: messageKind,
            subject: `${subscription.website_name} expires ${notice.label}`,
            bodyText: `Your website subscription for ${subscription.website_name} expires ${notice.label}. Please contact Matrouh Solutions to renew service.`,
          },
          update: {},
        });
        await transaction.websiteSubscription.update({
          where: { id: subscription.subscription_id },
          data: { lastNotifiedAt: new Date() },
        });
      },
    );
  }
}

async function recordHeartbeat(status: string): Promise<void> {
  const now = new Date();
  await database.serviceHeartbeat.upsert({
    where: { instanceId: workerId },
    update: { status, heartbeatAt: now, metadataJson: { pid: process.pid } },
    create: {
      instanceId: workerId,
      service: "worker",
      status,
      metadataJson: { pid: process.pid },
      startedAt: now,
      heartbeatAt: now,
    },
  });
}

async function runJob(job: ClaimedJob, signal: AbortSignal): Promise<void> {
  const attempt = await withTenantTransaction(database, tenantContext(job), (transaction) =>
    transaction.jobAttempt.create({
      data: {
        id: randomUUID(),
        organizationId: job.organizationId,
        jobId: job.id,
        attemptNumber: job.attemptCount,
        status: "running",
        workerId,
      },
    }),
  );

  try {
    if (job.type === "publication.requested" && job.version === 1) {
      await processPublishJob(job, signal);
    } else if (job.type === "domain.verify" && job.version === 1) {
      await processDomainVerificationJob(job);
    } else if (job.type === "domain.disconnect" && job.version === 1) {
      await processDomainDisconnectJob(job);
    } else if (job.type === "media.process" && job.version === 1) {
      await processMediaJob(job);
    } else if (job.type === "media.gc" && job.version === 1) {
      await processMediaGcJob(job);
    } else {
      throw new PermanentJobError("Unsupported job type or version", "JOB_UNSUPPORTED");
    }
    await withTenantTransaction(database, tenantContext(job), async (transaction) => {
      await transaction.jobAttempt.update({
        where: { id: attempt.id },
        data: { status: "succeeded", finishedAt: new Date() },
      });
      await transaction.job.update({
        where: { id: job.id },
        data: {
          status: "succeeded",
          completedAt: new Date(),
          lockedAt: null,
          lockOwner: null,
          lockExpiresAt: null,
        },
      });
    });
    console.log(JSON.stringify({ service: "worker", event: "job.succeeded", jobId: job.id }));
  } catch (error) {
    const permanent = error instanceof PermanentJobError;
    const retryable = !permanent && job.attemptCount < job.maxAttempts;
    const failure = errorDetails(error);
    await withTenantTransaction(database, tenantContext(job), async (transaction) => {
      await transaction.jobAttempt.update({
        where: { id: attempt.id },
        data: {
          status: retryable ? "retryable" : "failed",
          finishedAt: new Date(),
          errorCode: failure.code,
          errorMessage: failure.message,
        },
      });
      await transaction.job.update({
        where: { id: job.id },
        data: {
          status: retryable ? "retryable" : permanent ? "failed" : "dead_letter",
          availableAt: retryable
            ? new Date(Date.now() + retryDelay(job.attemptCount))
            : job.availableAt,
          lockedAt: null,
          lockOwner: null,
          lockExpiresAt: null,
          completedAt: retryable ? null : new Date(),
        },
      });
      if (!retryable && job.type === "publication.requested")
        await transaction.publication.updateMany({
          where: {
            id: job.id,
            organizationId: job.organizationId,
            status: { in: ["compiling", "validating"] },
          },
          data: { status: "failed", failureCode: failure.code },
        });
      if (!retryable && job.type === "domain.verify") {
        const domainId = domainIdFromPayload(job.payloadJson);
        if (domainId) {
          await transaction.domain.updateMany({
            where: { id: domainId, organizationId: job.organizationId, status: { not: "active" } },
            data: { status: "failed", revision: { increment: 1 } },
          });
        }
      }
      if (!retryable && job.type === "media.process") {
        const assetId = mediaIdFromPayload(job.payloadJson);
        if (assetId) {
          await transaction.mediaAsset.updateMany({
            where: {
              id: assetId,
              organizationId: job.organizationId,
              status: { notIn: ["ready", "deleted"] },
            },
            data: {
              status: "rejected",
              metadataJson: jsonInput({ processing: "failed", failureCode: failure.code }),
              revision: { increment: 1 },
            },
          });
        }
      }
    });
    console.error(
      JSON.stringify({
        service: "worker",
        event: retryable ? "job.retryable" : "job.failed",
        jobId: job.id,
        ...failure,
      }),
    );
  }
}

async function claimJob() {
  // workerId is process-generated and validated above. Keeping this as a literal also supports
  // Prisma's local development database, whose proxy cannot alternate unnamed statements with
  // different bind counts on the same connection.
  const rows = await database.$queryRawUnsafe<ClaimedJob[]>(`
    SELECT id, organization_id AS "organizationId", job_type AS "type", job_version AS "version",
      payload_json AS "payloadJson",
      attempt_count AS "attemptCount", max_attempts AS "maxAttempts",
      available_at AS "availableAt", correlation_id AS "correlationId"
    FROM claim_factory_job('${workerId}')
  `);
  return rows[0] ?? null;
}

async function processDomainVerificationJob(job: ClaimedJob): Promise<void> {
  const payload = parseDomainPayload(job.payloadJson);
  const domain = await withTenantTransaction(database, tenantContext(job), (transaction) =>
    transaction.domain.findFirst({
      where: { id: payload.domainId, organizationId: job.organizationId, releasedAt: null },
      include: { verificationAttempts: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  );
  if (!domain) throw new PermanentJobError("Domain was not found", "DOMAIN_NOT_FOUND");
  if (domain.kind !== "custom")
    throw new PermanentJobError("Domain is not custom", "DOMAIN_KIND_INVALID");
  const attempt = domain.verificationAttempts[0];
  if (!attempt) throw new PermanentJobError("Challenge was not found", "DOMAIN_CHALLENGE_MISSING");
  const secret =
    workerConfig.FACTORY_DOMAIN_CHALLENGE_SECRET ?? workerConfig.PREVIEW_SIGNING_SECRET;
  const currentChallenge = domainOwnershipChallenge(attempt.id, secret);
  const legacyChallenge = domainOwnershipChallenge(domain.id, secret);
  const challenge =
    domainChallengeHash(currentChallenge) === attempt.challengeValueHash
      ? currentChallenge
      : legacyChallenge;
  if (domainChallengeHash(challenge) !== attempt.challengeValueHash) {
    throw new PermanentJobError("Challenge integrity failed", "DOMAIN_CHALLENGE_MISMATCH");
  }

  let verified = false;
  try {
    const records = await resolveTxt(`_factory-verification.${domain.hostnameNormalized}`);
    verified = records.some((segments) => segments.join("").trim() === challenge);
  } catch {
    verified = false;
  }
  if (!verified) {
    await withTenantTransaction(database, tenantContext(job), (transaction) =>
      transaction.domainVerificationAttempt.update({
        where: { id: attempt.id },
        data: { status: "pending", checkedAt: new Date(), failureCode: "DNS_TXT_NOT_FOUND" },
      }),
    );
    throw new Error("DOMAIN_DNS_CHALLENGE_NOT_FOUND");
  }

  await withTenantTransaction(database, tenantContext(job), async (transaction) => {
    await transaction.domainVerificationAttempt.update({
      where: { id: attempt.id },
      data: { status: "succeeded", checkedAt: new Date(), failureCode: null },
    });
    await transaction.domain.update({
      where: { id: domain.id },
      data: { status: "verified", revision: { increment: 1 } },
    });
  });

  const provider = await connectDomainProvider(domain.id, domain.hostnameNormalized);
  if (!provider) return;
  await withTenantTransaction(database, tenantContext(job), async (transaction) => {
    await transaction.certificateBinding.upsert({
      where: {
        providerKey_providerBindingId: {
          providerKey: provider.providerKey,
          providerBindingId: provider.bindingId,
        },
      },
      update: { status: provider.status, lastCheckedAt: new Date() },
      create: {
        id: randomUUID(),
        organizationId: job.organizationId,
        domainId: domain.id,
        providerKey: provider.providerKey,
        providerBindingId: provider.bindingId,
        status: provider.status,
        lastCheckedAt: new Date(),
      },
    });
    await transaction.domain.update({
      where: { id: domain.id },
      data: {
        status: provider.status === "active" ? "active" : "connecting",
        revision: { increment: 1 },
      },
    });
    if (provider.status === "active") {
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          organizationId: job.organizationId,
          eventType: "DomainActivated",
          eventVersion: 1,
          aggregateType: "website",
          aggregateId: domain.websiteId,
          aggregateRevision: domain.revision + 2n,
          payloadJson: jsonInput({ domainId: domain.id, websiteId: domain.websiteId }),
          correlationId: job.correlationId,
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: job.organizationId,
          actorType: "system",
          actorId,
          action: "domain.activated",
          resourceType: "domain",
          resourceId: domain.id,
          correlationId: job.correlationId,
          metadataJson: jsonInput({
            hostname: domain.hostnameNormalized,
            websiteId: domain.websiteId,
          }),
          retentionClass: "standard",
        },
      });
    }
  });
  if (provider.status !== "active") throw new Error("DOMAIN_CERTIFICATE_PENDING");
}

async function processDomainDisconnectJob(job: ClaimedJob): Promise<void> {
  const { domainId } = parseDomainPayload(job.payloadJson);
  const domain = await withTenantTransaction(database, tenantContext(job), (transaction) =>
    transaction.domain.findFirst({
      where: { id: domainId, organizationId: job.organizationId },
      include: { certificateBindings: { orderBy: { createdAt: "desc" } } },
    }),
  );
  if (!domain) throw new PermanentJobError("Domain was not found", "DOMAIN_NOT_FOUND");
  await disconnectDomainProvider(domain.id, domain.hostnameNormalized, domain.certificateBindings);
  await withTenantTransaction(database, tenantContext(job), async (transaction) => {
    await transaction.certificateBinding.updateMany({
      where: { organizationId: job.organizationId, domainId },
      data: { status: "disconnected", lastCheckedAt: new Date() },
    });
    await transaction.domain.update({
      where: { id: domainId },
      data: { status: "disconnected", releasedAt: new Date(), revision: { increment: 1 } },
    });
    await transaction.outboxEvent.create({
      data: {
        id: randomUUID(),
        organizationId: job.organizationId,
        eventType: "DomainReleased",
        eventVersion: 1,
        aggregateType: "website",
        aggregateId: domain.websiteId,
        aggregateRevision: domain.revision + 1n,
        payloadJson: jsonInput({ domainId, websiteId: domain.websiteId }),
        correlationId: job.correlationId,
      },
    });
    await transaction.auditEvent.create({
      data: {
        id: randomUUID(),
        organizationId: job.organizationId,
        actorType: "system",
        actorId,
        action: "domain.released",
        resourceType: "domain",
        resourceId: domainId,
        correlationId: job.correlationId,
        metadataJson: jsonInput({ hostname: domain.hostnameNormalized }),
        retentionClass: "standard",
      },
    });
  });
}

async function processMediaJob(job: ClaimedJob): Promise<void> {
  const { assetId } = parseMediaPayload(job.payloadJson);
  const asset = await withTenantTransaction(database, tenantContext(job), (transaction) =>
    transaction.mediaAsset.findFirst({
      where: { id: assetId, organizationId: job.organizationId },
    }),
  );
  if (!asset) throw new PermanentJobError("Media asset was not found", "MEDIA_NOT_FOUND");
  if (asset.status === "deleted") return;
  if (asset.status === "ready") return;
  if (!asset.contentHash || !asset.detectedContentType) {
    throw new PermanentJobError("Media metadata is incomplete", "MEDIA_METADATA_INVALID");
  }

  await withTenantTransaction(database, tenantContext(job), (transaction) =>
    transaction.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: "scanning",
        metadataJson: jsonInput({ processing: "scanning" }),
        revision: { increment: 1 },
      },
    }),
  );

  const provider = mediaProvider();
  const processed: ProcessedMedia = provider
    ? await provider.process({
        assetId: asset.id,
        organizationId: job.organizationId,
        storageKey: asset.storageKey,
        contentHash: asset.contentHash,
        contentType: asset.detectedContentType,
      })
    : {
        safe: true,
        detectedContentType: asset.detectedContentType,
        metadata: { scanner: "local-development", signatureChecked: true },
        variants: [
          {
            key: "original",
            storageKey: asset.storageKey,
            contentHash: asset.contentHash,
            contentType: asset.detectedContentType,
            byteSize: Number(asset.byteSize),
          },
        ],
      };
  validateProcessedMedia(processed, job.organizationId);

  if (!processed.safe) {
    await withTenantTransaction(database, tenantContext(job), async (transaction) => {
      await transaction.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: "rejected",
          detectedContentType: processed.detectedContentType,
          metadataJson: jsonInput({ ...processed.metadata, processing: "rejected" }),
          revision: { increment: 1 },
        },
      });
      await createMediaAudit(transaction, job, asset.id, "media.rejected", processed.metadata);
    });
    return;
  }

  await withTenantTransaction(database, tenantContext(job), async (transaction) => {
    await transaction.mediaAsset.update({
      where: { id: asset.id },
      data: { status: "processing", revision: { increment: 1 } },
    });
    await transaction.mediaVariant.deleteMany({
      where: { organizationId: job.organizationId, mediaAssetId: asset.id },
    });
    await transaction.mediaVariant.createMany({
      data: processed.variants.map((variant) => ({
        id: randomUUID(),
        organizationId: job.organizationId,
        mediaAssetId: asset.id,
        variantKey: variant.key,
        storageKey: variant.storageKey,
        contentHash: variant.contentHash ?? null,
        contentType: variant.contentType,
        byteSize: BigInt(variant.byteSize),
        width: variant.width ?? null,
        height: variant.height ?? null,
      })),
    });
    await transaction.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: "ready",
        detectedContentType: processed.detectedContentType,
        metadataJson: jsonInput({ ...processed.metadata, processing: "ready" }),
        revision: { increment: 1 },
      },
    });
    await createMediaAudit(transaction, job, asset.id, "media.ready", {
      variantCount: processed.variants.length,
      detectedContentType: processed.detectedContentType,
    });
  });
}

async function processMediaGcJob(job: ClaimedJob): Promise<void> {
  const { assetId } = parseMediaPayload(job.payloadJson);
  const asset = await withTenantTransaction(database, tenantContext(job), (transaction) =>
    transaction.mediaAsset.findFirst({
      where: { id: assetId, organizationId: job.organizationId },
      include: { _count: { select: { references: true } }, variants: true },
    }),
  );
  if (!asset) return;
  if (asset.status !== "deleted") {
    throw new PermanentJobError("Media asset is not deleted", "MEDIA_NOT_DELETED");
  }
  if (asset._count.references > 0) {
    throw new PermanentJobError("Media asset is still referenced", "MEDIA_IN_USE");
  }

  const keys = new Set([asset.storageKey, ...asset.variants.map((variant) => variant.storageKey)]);
  const provider = mediaProvider();
  for (const storageKey of keys) {
    if (provider) await provider.delete(storageKey);
    else await deleteLocalMedia(storageKey, job.organizationId);
  }
  await withTenantTransaction(database, tenantContext(job), async (transaction) => {
    await createMediaAudit(transaction, job, asset.id, "media.garbage_collected", {
      storageKeys: keys.size,
    });
    await transaction.mediaVariant.deleteMany({
      where: { organizationId: job.organizationId, mediaAssetId: asset.id },
    });
    await transaction.mediaAsset.delete({ where: { id: asset.id } });
  });
}

function parseMediaPayload(value: unknown): { assetId: string } {
  const assetId = mediaIdFromPayload(value);
  if (!assetId) throw new PermanentJobError("Media payload is invalid", "INVALID_PAYLOAD");
  return { assetId };
}

function mediaIdFromPayload(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const assetId = (value as Record<string, unknown>).assetId;
  return typeof assetId === "string" && /^[0-9a-f-]{36}$/i.test(assetId) ? assetId : null;
}

function mediaProvider(): RemoteMediaProvider | null {
  const endpoint = workerConfig.FACTORY_MEDIA_PROVIDER_URL;
  const secret = workerConfig.FACTORY_MEDIA_PROVIDER_SECRET;
  return endpoint && secret ? new RemoteMediaProvider({ endpoint, secret }) : null;
}

function validateProcessedMedia(value: ProcessedMedia, organizationId: string): void {
  if (!value.detectedContentType || value.variants.length < 1 || value.variants.length > 20) {
    throw new PermanentJobError("Media provider response is invalid", "MEDIA_RESULT_INVALID");
  }
  const seen = new Set<string>();
  for (const variant of value.variants) {
    if (
      !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(variant.key) ||
      seen.has(variant.key) ||
      !Number.isSafeInteger(variant.byteSize) ||
      variant.byteSize < 1 ||
      !variant.contentType ||
      !isOrganizationMediaKey(variant.storageKey, organizationId)
    ) {
      throw new PermanentJobError("Media variant is invalid", "MEDIA_VARIANT_INVALID");
    }
    seen.add(variant.key);
  }
}

function isOrganizationMediaKey(storageKey: string, organizationId: string): boolean {
  const normalized = storageKey.replaceAll("\\", "/");
  return normalized.startsWith(`media/${organizationId}/`) && !normalized.includes("..");
}

async function deleteLocalMedia(storageKey: string, organizationId: string): Promise<void> {
  if (!isOrganizationMediaKey(storageKey, organizationId)) {
    throw new PermanentJobError("Invalid media key", "MEDIA_KEY_INVALID");
  }
  const root = resolve(workspaceRoot, "media", organizationId);
  const target = resolve(workspaceRoot, storageKey);
  const pathFromRoot = relative(root, target);
  if (!pathFromRoot || pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
    throw new PermanentJobError("Invalid media path", "MEDIA_KEY_INVALID");
  }
  await unlink(target).catch((error: unknown) => {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  });
}

async function createMediaAudit(
  transaction: DatabaseTransaction,
  job: ClaimedJob,
  assetId: string,
  action: string,
  metadata: unknown,
): Promise<void> {
  await transaction.auditEvent.create({
    data: {
      id: randomUUID(),
      organizationId: job.organizationId,
      actorType: "system",
      actorId,
      action,
      resourceType: "media_asset",
      resourceId: assetId,
      correlationId: job.correlationId,
      metadataJson: jsonInput(metadata),
      retentionClass: "standard",
    },
  });
}

function parseDomainPayload(value: unknown): { domainId: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PermanentJobError("Domain payload is invalid", "INVALID_PAYLOAD");
  }
  const domainId = (value as Record<string, unknown>).domainId;
  if (typeof domainId !== "string" || !/^[0-9a-f-]{36}$/i.test(domainId)) {
    throw new PermanentJobError("Domain payload is invalid", "INVALID_PAYLOAD");
  }
  return { domainId };
}

function domainIdFromPayload(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const domainId = (value as Record<string, unknown>).domainId;
  return typeof domainId === "string" && /^[0-9a-f-]{36}$/i.test(domainId) ? domainId : null;
}

async function connectDomainProvider(
  domainId: string,
  hostname: string,
): Promise<{ providerKey: string; bindingId: string; status: string } | null> {
  const endpoint = workerConfig.FACTORY_DOMAIN_PROVIDER_URL;
  const secret = workerConfig.FACTORY_DOMAIN_PROVIDER_SECRET;
  if (!endpoint || !secret) {
    if (workerConfig.FACTORY_DEPLOYMENT_MODE === "production") {
      throw new Error("DOMAIN_PROVIDER_NOT_CONFIGURED");
    }
    return null;
  }
  const body = JSON.stringify({ domainId, hostname, idempotencyKey: domainId });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-factory-signature": signature,
      "x-factory-timestamp": timestamp,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`DOMAIN_PROVIDER_FAILED_${response.status}`);
  const result = (await response.json()) as Record<string, unknown>;
  if (
    typeof result.providerKey !== "string" ||
    typeof result.bindingId !== "string" ||
    typeof result.status !== "string" ||
    !["pending", "connecting", "active", "failed"].includes(result.status)
  ) {
    throw new PermanentJobError("Domain provider response is invalid", "DOMAIN_PROVIDER_INVALID");
  }
  if (result.status === "failed") {
    throw new PermanentJobError(
      "Domain provider rejected the hostname",
      "DOMAIN_PROVIDER_REJECTED",
    );
  }
  return { providerKey: result.providerKey, bindingId: result.bindingId, status: result.status };
}

async function disconnectDomainProvider(
  domainId: string,
  hostname: string,
  bindings: readonly { providerKey: string; providerBindingId: string }[],
): Promise<void> {
  const endpoint = workerConfig.FACTORY_DOMAIN_PROVIDER_URL;
  const secret = workerConfig.FACTORY_DOMAIN_PROVIDER_SECRET;
  if (!endpoint || !secret) {
    if (workerConfig.FACTORY_DEPLOYMENT_MODE === "production") {
      throw new Error("DOMAIN_PROVIDER_NOT_CONFIGURED");
    }
    return;
  }
  const body = JSON.stringify({
    domainId,
    hostname,
    bindings,
    idempotencyKey: `release:${domainId}`,
  });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      "x-factory-signature": signature,
      "x-factory-timestamp": timestamp,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`DOMAIN_PROVIDER_DISCONNECT_FAILED_${response.status}`);
  }
}

async function claimOutboxEvent(): Promise<ClaimedOutboxEvent | null> {
  const rows = await database.$queryRaw<ClaimedOutboxEvent[]>`
    SELECT id, organization_id AS "organizationId", event_type AS "eventType",
      event_version AS "eventVersion", aggregate_type AS "aggregateType",
      aggregate_id AS "aggregateId", aggregate_revision AS "aggregateRevision",
      payload_json AS "payloadJson", occurred_at AS "occurredAt",
      correlation_id AS "correlationId", causation_id AS "causationId",
      attempt_count AS "attemptCount"
    FROM claim_outbox_event(300)
  `;
  return rows[0] ?? null;
}

async function deliverOutboxEvent(event: ClaimedOutboxEvent): Promise<void> {
  try {
    validateOutboxEvent(event);
    if (
      event.eventType === "WebsitePublished" ||
      event.eventType === "WebsiteRolledBack" ||
      event.eventType === "DomainActivated" ||
      event.eventType === "DomainReleased"
    ) {
      await invalidateWebsiteCache(event);
    }
    console.log(
      JSON.stringify({
        service: "worker",
        event: "outbox.delivered",
        eventId: event.id,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        organizationId: event.organizationId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        aggregateRevision: event.aggregateRevision.toString(),
        occurredAt: event.occurredAt.toISOString(),
        correlationId: event.correlationId,
        causationId: event.causationId,
      }),
    );
    await withTenantTransaction(database, eventTenantContext(event), (transaction) =>
      transaction.outboxEvent.update({
        where: { id: event.id },
        data: { status: "published", publishedAt: new Date(), availableAt: new Date() },
      }),
    );
  } catch (error) {
    const failure = errorDetails(error);
    const exhausted = event.attemptCount >= 8 || error instanceof PermanentJobError;
    await withTenantTransaction(database, eventTenantContext(event), (transaction) =>
      transaction.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          availableAt: new Date(
            Date.now() + (exhausted ? 24 * 60 * 60 * 1_000 : retryDelay(event.attemptCount)),
          ),
        },
      }),
    );
    console.error(
      JSON.stringify({
        service: "worker",
        event: "outbox.failed",
        eventId: event.id,
        eventType: event.eventType,
        exhausted,
        ...failure,
      }),
    );
  }
}

async function invalidateWebsiteCache(event: ClaimedOutboxEvent): Promise<void> {
  const endpoint = workerConfig.FACTORY_CACHE_INVALIDATION_URL;
  const secret = workerConfig.FACTORY_CACHE_INVALIDATION_SECRET;
  if (!endpoint || !secret) {
    if (workerConfig.FACTORY_DEPLOYMENT_MODE === "production") {
      throw new Error("CACHE_INVALIDATION_NOT_CONFIGURED");
    }
    return;
  }
  const hostnames = await withTenantTransaction(
    database,
    eventTenantContext(event),
    (transaction) =>
      transaction.domain
        .findMany({
          where: {
            organizationId: event.organizationId,
            websiteId: event.aggregateId,
            status: "active",
            releasedAt: null,
          },
          select: { hostnameNormalized: true },
        })
        .then((domains) => domains.map((domain) => domain.hostnameNormalized)),
  );
  if (hostnames.length === 0) return;
  const body = JSON.stringify({ eventId: event.id, hostnames });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-factory-signature": signature,
      "x-factory-timestamp": timestamp,
    },
    body,
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`CACHE_INVALIDATION_FAILED_${response.status}`);
}

function validateOutboxEvent(event: ClaimedOutboxEvent): void {
  if (!event.organizationId || !event.aggregateId || !event.correlationId) {
    throw new PermanentJobError("Outbox envelope is incomplete", "INVALID_EVENT_ENVELOPE");
  }
  if (
    ![
      "PublicationRequested",
      "WebsitePublished",
      "WebsiteRolledBack",
      "DomainActivated",
      "DomainReleased",
    ].includes(event.eventType) ||
    event.eventVersion !== 1
  ) {
    throw new PermanentJobError(
      `Unsupported event contract ${event.eventType}@${event.eventVersion}`,
      "UNSUPPORTED_EVENT_CONTRACT",
    );
  }
  if (!event.payloadJson || typeof event.payloadJson !== "object") {
    throw new PermanentJobError("Outbox payload must be an object", "INVALID_EVENT_PAYLOAD");
  }
}

async function cleanupExpiredPreviews(): Promise<void> {
  const previews = await database.$queryRaw<ExpiredPreviewArtifact[]>`
    SELECT id, organization_id AS "organizationId", storage_uri AS "storageUri"
    FROM list_expired_preview_artifacts(50)
  `;
  let removed = 0;
  for (const preview of previews) {
    try {
      await artifactStore.deleteOrphan(preview.storageUri);
      await withTenantTransaction(
        database,
        {
          organizationId: preview.organizationId,
          actorId,
          correlationId: `preview-cleanup:${preview.id}`,
        },
        (transaction) =>
          transaction.previewSnapshot.deleteMany({
            where: {
              id: preview.id,
              organizationId: preview.organizationId,
              expiresAt: { lte: new Date() },
            },
          }),
      );
      removed += 1;
    } catch (error) {
      console.error(
        JSON.stringify({
          service: "worker",
          event: "preview.cleanup_failed",
          previewId: preview.id,
          ...errorDetails(error),
        }),
      );
    }
  }
  if (removed > 0) {
    console.log(JSON.stringify({ service: "worker", event: "preview.cleaned", removed }));
  }
}

async function cleanupOperationalRecords(): Promise<void> {
  const now = new Date();
  const standardCutoff = new Date(
    now.getTime() - workerConfig.FACTORY_STANDARD_AUDIT_RETENTION_DAYS * 86_400_000,
  );
  const securityCutoff = new Date(
    now.getTime() - workerConfig.FACTORY_SECURITY_AUDIT_RETENTION_DAYS * 86_400_000,
  );
  const staleHeartbeatCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const [rateLimits, idempotency, sessions, audit, heartbeats] = await database.$transaction(
    async (transaction) => {
      const rateLimits = await transaction.rateLimitBucket.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      const idempotency = await transaction.idempotencyRecord.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      const sessions = await transaction.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } },
            { revokedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } },
          ],
        },
      });
      const audit = await transaction.auditEvent.deleteMany({
        where: {
          OR: [
            { retentionClass: "standard", occurredAt: { lt: standardCutoff } },
            { retentionClass: "security", occurredAt: { lt: securityCutoff } },
          ],
        },
      });
      const heartbeats = await transaction.serviceHeartbeat.deleteMany({
        where: { heartbeatAt: { lt: staleHeartbeatCutoff } },
      });
      return [rateLimits, idempotency, sessions, audit, heartbeats] as const;
    },
  );
  const removed =
    rateLimits.count + idempotency.count + sessions.count + audit.count + heartbeats.count;
  if (removed > 0) {
    console.log(
      JSON.stringify({
        service: "worker",
        event: "retention.cleaned",
        rateLimits: rateLimits.count,
        idempotency: idempotency.count,
        sessions: sessions.count,
        audit: audit.count,
        heartbeats: heartbeats.count,
      }),
    );
  }
}

async function processPublishJob(job: ClaimedJob, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new Error("ABORTED");
  if (!job.organizationId)
    throw new PermanentJobError("Job is missing organizationId", "INVALID_JOB");

  const payload = parsePublishPayload(job.payloadJson);
  const website = await withTenantTransaction(
    database,
    { organizationId: job.organizationId, actorId, correlationId: job.correlationId },
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: {
          organizationId_id: { organizationId: job.organizationId, id: payload.websiteId },
        },
        include: {
          subscription: true,
          locales: true,
          domains: true,
          settingsDrafts: { orderBy: { updatedAt: "desc" } },
          themeDrafts: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" } },
          seoDrafts: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" } },
          navigationDrafts: {
            where: { deletedAt: null },
            orderBy: [{ definitionId: "asc" }, { locale: "asc" }],
            include: { nodes: { where: { deletedAt: null }, orderBy: { orderKey: "asc" } } },
          },
          pages: {
            where: { deletedAt: null },
            orderBy: { orderKey: "asc" },
            include: { sections: { where: { deletedAt: null }, orderBy: { orderKey: "asc" } } },
          },
        },
      });
      if (!website) return null;
      const mediaReferences = await transaction.mediaReference.findMany({
        where: {
          organizationId: job.organizationId,
          websiteId: payload.websiteId,
          asset: { status: "ready" },
        },
        include: { asset: { include: { variants: true } } },
      });
      return { ...website, mediaReferences };
    },
  );
  if (!website) throw new PermanentJobError("Website was not found", "WEBSITE_NOT_FOUND");
  if (
    website.subscription &&
    (website.subscription.status !== "active" || website.subscription.expiresAt <= new Date())
  ) {
    throw new PermanentJobError("Website subscription has expired", "SUBSCRIPTION_EXPIRED");
  }
  if (
    payload.requestedDraftRevision !== undefined &&
    website.draftRevision.toString() !== payload.requestedDraftRevision
  ) {
    throw new PermanentJobError("Requested draft revision is stale", "STALE_DRAFT_REVISION");
  }
  if (
    (payload.templateId !== undefined && payload.templateId !== website.templateId) ||
    (payload.templateVersion !== undefined && payload.templateVersion !== website.templateVersion)
  ) {
    throw new PermanentJobError("Requested template identity is stale", "STALE_TEMPLATE_IDENTITY");
  }

  const candidate = (await discoverTemplates(templatesRoot)).find(
    (item) =>
      item.discovery.templateId === website.templateId &&
      item.discovery.templateVersion === website.templateVersion,
  );
  if (!candidate) throw new PermanentJobError("Template was not found", "TEMPLATE_NOT_FOUND");

  const artifact = await loadTemplateArtifact(candidate, signal);
  const template = artifact.definition;
  const catalogVersion = await database.templateVersionRecord.findUnique({
    where: {
      templateId_templateVersion: {
        templateId: website.templateId,
        templateVersion: website.templateVersion,
      },
    },
    select: { artifactHash: true, lifecycleStatus: true, validationStatus: true },
  });
  if (
    !catalogVersion ||
    catalogVersion.lifecycleStatus !== "ready" ||
    catalogVersion.validationStatus !== "valid" ||
    catalogVersion.artifactHash !== artifact.artifactHash
  ) {
    throw new PermanentJobError("Template artifact is not active", "TEMPLATE_NOT_READY");
  }
  const validation = validateTemplate(artifact, {
    factoryVersion: "0.1.0",
    rendererVersion: "0.1.0",
    supportedSdkVersions: ["1.0.0"],
    contentSchemaVersions: [1],
    themeSchemaVersions: [1],
    publicationSnapshotVersions: [1],
  });
  if (!validation.valid) {
    throw new PermanentJobError(
      JSON.stringify(validation.checks.filter((check) => !check.valid)),
      "TEMPLATE_VALIDATION_FAILED",
    );
  }
  const publicationId = job.id;
  const artifactHash = artifact.artifactHash;
  await withTenantTransaction(database, tenantContext(job), async (transaction) => {
    const existing = await transaction.publication.findUnique({ where: { id: publicationId } });
    if (existing) {
      if (
        existing.websiteId !== website.id ||
        existing.sourceDraftRevision !== website.draftRevision
      ) {
        throw new PermanentJobError(
          "Retry publication identity changed",
          "PUBLICATION_IDENTITY_CONFLICT",
        );
      }
      await transaction.publication.update({
        where: { id: publicationId },
        data: { status: "compiling", failureCode: null },
      });
      return;
    }
    const aggregate = await transaction.publication.aggregate({
      where: { websiteId: website.id },
      _max: { sequenceNumber: true },
    });
    await transaction.publication.create({
      data: {
        id: publicationId,
        organizationId: job.organizationId,
        websiteId: website.id,
        sequenceNumber: (aggregate._max.sequenceNumber ?? 0n) + 1n,
        sourceDraftRevision: website.draftRevision,
        templateId: website.templateId,
        templateVersion: website.templateVersion,
        templateArtifactHash: artifactHash,
        snapshotSchemaVersion: template.compatibility.publicationSnapshotVersion,
        status: "compiling",
      },
    });
  });
  const result = compilePublication(
    toDraftProjection(website, publicationId, template),
    template,
    artifactHash,
    artifact.manifest.manifestHash,
  );
  if (!result.success) {
    throw new PermanentJobError(JSON.stringify(result.diagnostics), "COMPILE_FAILED");
  }

  await withTenantTransaction(database, tenantContext(job), (transaction) =>
    transaction.publication.update({
      where: { id: publicationId },
      data: { status: "validating" },
    }),
  );
  const runtime = instantiateTemplateRuntime(
    {
      definition: template,
      artifactHash,
      manifestHash: artifact.manifest.manifestHash,
    },
    result.snapshot,
  );
  for (const route of result.snapshot.routes) {
    if (signal.aborted) throw new Error("ABORTED");
    const markup = renderToStaticMarkup(runtime.render(route.pathname).node);
    if (markup.length > 2_000_000)
      throw new PermanentJobError("Rendered route is too large", "SMOKE_RENDER_TOO_LARGE");
  }
  const storedArtifact = await artifactStore.putImmutable(publicationId, result.snapshot);

  await withTenantTransaction(
    database,
    { organizationId: job.organizationId, actorId, correlationId: job.correlationId },
    async (transaction) => {
      const currentWebsite = await transaction.website.findUnique({
        where: {
          organizationId_id: { organizationId: job.organizationId, id: website.id },
        },
        select: { activePublicationId: true, draftRevision: true, revision: true },
      });
      if (!currentWebsite) {
        throw new PermanentJobError("Website was not found", "WEBSITE_NOT_FOUND");
      }

      await transaction.publication.update({
        where: { id: publicationId },
        data: { status: "ready", readyAt: new Date() },
      });
      await transaction.publicationArtifact.upsert({
        where: {
          publicationId_artifactKind: { publicationId, artifactKind: "snapshot" },
        },
        create: {
          id: randomUUID(),
          organizationId: job.organizationId,
          publicationId,
          artifactKind: "snapshot",
          storageUri: storedArtifact.uri,
          contentHash: storedArtifact.hash,
          byteSize: BigInt(storedArtifact.byteSize),
        },
        update: {},
      });
      await transaction.website.update({
        where: { organizationId_id: { organizationId: job.organizationId, id: website.id } },
        data: {
          activePublicationId: publicationId,
          status: currentWebsite.draftRevision === website.draftRevision ? "published" : "draft",
          revision: { increment: 1 },
        },
      });
      await transaction.publicationActivation.create({
        data: {
          id: randomUUID(),
          organizationId: job.organizationId,
          websiteId: website.id,
          publicationId,
          activationKind: currentWebsite.activePublicationId ? "publish" : "initial",
          previousPublicationId: currentWebsite.activePublicationId,
          actorId,
          correlationId: job.correlationId,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          organizationId: job.organizationId,
          eventType: "WebsitePublished",
          eventVersion: 1,
          aggregateType: "website",
          aggregateId: website.id,
          aggregateRevision: currentWebsite.revision + 1n,
          payloadJson: jsonInput({
            websiteId: website.id,
            publicationId,
            requestedDraftRevision: payload.requestedDraftRevision,
          }),
          correlationId: job.correlationId,
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: job.organizationId,
          actorType: "system",
          actorId,
          action: "website.published",
          resourceType: "website",
          resourceId: website.id,
          correlationId: job.correlationId,
          metadataJson: jsonInput({
            publicationId,
            snapshotHash: result.hash,
            requestedDraftRevision: payload.requestedDraftRevision,
          }),
          retentionClass: "standard",
        },
      });
    },
  );
}

function parsePublishPayload(value: unknown): PublishPayload {
  if (!value || typeof value !== "object") {
    throw new PermanentJobError("Publish payload must be an object", "INVALID_PAYLOAD");
  }
  const payload = value as Partial<PublishPayload>;
  if (!payload.websiteId || typeof payload.websiteId !== "string") {
    throw new PermanentJobError("Publish payload is missing websiteId", "INVALID_PAYLOAD");
  }
  const parsed: PublishPayload = { websiteId: payload.websiteId };
  if (typeof payload.requestedDraftRevision === "string") {
    parsed.requestedDraftRevision = payload.requestedDraftRevision;
  }
  if (typeof payload.templateId === "string") {
    parsed.templateId = payload.templateId;
  }
  if (typeof payload.templateVersion === "string") {
    parsed.templateVersion = payload.templateVersion;
  }
  return parsed;
}

function toDraftProjection(
  website: WebsiteForPublish,
  publicationId: string,
  template: TemplateDefinition,
): DraftProjection {
  return {
    organizationId: website.organizationId,
    websiteId: website.id,
    publicationId,
    revision: website.draftRevision,
    name: website.name,
    defaultLocale: website.defaultLocale,
    ...(website.settingsDrafts.find((item) => item.locale === null)?.schemaVersion === undefined
      ? {}
      : {
          settingsSchemaVersion: website.settingsDrafts.find((item) => item.locale === null)!
            .schemaVersion,
        }),
    settings: (website.settingsDrafts.find((item) => item.locale === null)?.contentJson ??
      template.websiteSchema.parse({})) as JsonValue,
    locales: website.locales.map((item) => ({
      locale: item.locale,
      fallbackLocale: item.fallbackLocale,
    })),
    pages: website.pages.map((page) => ({
      id: page.id,
      pageTypeId: page.pageTypeId,
      locale: page.locale,
      title: page.title,
      slug: page.slug,
      seo: (website.seoDrafts.find(
        (item) => item.pageId === page.id && (item.locale === page.locale || item.locale === null),
      )?.metadataJson ?? { title: page.title, description: website.name }) as JsonValue,
      sections: page.sections.map((section) => ({
        id: section.id,
        sectionTypeId: section.sectionTypeId,
        schemaVersion: section.schemaVersion,
        content: section.contentJson as JsonValue,
        orderKey: section.orderKey,
      })),
    })),
    navigation: website.navigationDrafts.map((navigation) => ({
      definitionId: navigation.definitionId,
      locale: navigation.locale,
      schemaVersion: navigation.visibilitySchemaVersion,
      nodes: buildNavigationTree(navigation.nodes),
    })),
    theme: (website.themeDrafts.find((item) => item.locale === null)?.tokensJson ??
      template.theme.defaults) as typeof template.theme.defaults,
    media: [...new Map(website.mediaReferences.map(({ asset }) => [asset.id, asset])).values()].map(
      (asset) => ({
        id: asset.id,
        url: websiteMediaUrl(asset.storageKey, website.domains[0]?.hostnameNormalized),
        contentHash: asset.contentHash,
        variants: Object.fromEntries(
          asset.variants.map((variant) => [
            variant.variantKey,
            websiteMediaUrl(variant.storageKey, website.domains[0]?.hostnameNormalized),
          ]),
        ),
      }),
    ),
  };
}

function buildNavigationTree(
  nodes: WebsiteForPublish["navigationDrafts"][number]["nodes"],
): JsonValue[] {
  const children = new Map<string | null, typeof nodes>();
  for (const node of nodes) {
    const siblings = children.get(node.parentNodeId) ?? [];
    children.set(node.parentNodeId, [...siblings, node]);
  }
  const visit = (parentId: string | null, ancestors: ReadonlySet<string>): JsonValue[] =>
    (children.get(parentId) ?? []).flatMap((node) => {
      if (ancestors.has(node.id)) return [];
      const nextAncestors = new Set(ancestors).add(node.id);
      const target = jsonRecord(node.targetJson);
      return [
        {
          id: node.id,
          kind: node.nodeKind,
          label: node.labelJson as JsonValue,
          visibility: node.visibilityJson as JsonValue,
          ...(node.nodeKind === "page" && node.pageId ? { pageId: node.pageId } : {}),
          ...(node.nodeKind === "external" && typeof target.href === "string"
            ? { href: target.href }
            : {}),
          children: visit(node.id, nextAncestors),
        },
      ];
    });
  return visit(null, new Set());
}

function websiteMediaUrl(storageKey: string, hostname: string | undefined): string {
  if (!hostname) throw new PermanentJobError("Website media hostname is missing", "MEDIA_HOSTNAME_MISSING");
  const filename = storageFilename(storageKey);
  const dashboardUrl = new URL(workerConfig.FACTORY_DASHBOARD_PUBLIC_URL);
  const localPort = hostname.endsWith(".localhost") ? dashboardUrl.port : "";
  const scheme = hostname.endsWith(".localhost") ? dashboardUrl.protocol : "https:";
  return `${scheme}//${hostname}${localPort ? `:${localPort}` : ""}/media/${encodeURIComponent(filename)}`;
}

function storageFilename(storageKey: string): string {
  const normalized = storageKey.replaceAll("\\", "/");
  const filename = normalized.split("/").at(-1);
  if (!filename || filename.includes("..")) {
    throw new PermanentJobError("Invalid media key", "MEDIA_KEY_INVALID");
  }
  return filename;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function jsonInput(value: unknown): Exclude<JsonValue, null> {
  return (value ?? {}) as Exclude<JsonValue, null>;
}

function tenantContext(job: ClaimedJob) {
  return { organizationId: job.organizationId, actorId, correlationId: job.correlationId };
}

function eventTenantContext(event: ClaimedOutboxEvent) {
  return {
    organizationId: event.organizationId,
    actorId,
    correlationId: event.correlationId,
  };
}

function errorDetails(error: unknown): { code: string; message: string } {
  if (error instanceof PermanentJobError) return { code: error.code, message: error.message };
  if (error instanceof Error) return { code: error.name || "ERROR", message: error.message };
  return { code: "UNKNOWN", message: String(error) };
}

function retryDelay(attempt: number): number {
  return Math.min(60_000, 500 * 2 ** Math.max(0, attempt - 1));
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timeout = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}
