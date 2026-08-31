"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  enforceRateLimit,
  PrismaPublicationCommandRepository,
  withTenantTransaction,
  type DatabaseTransaction,
} from "@factory/database";
import { localizeTemplateDefault, localizedTemplateTitle } from "@factory/content";
import {
  domainChallengeHash,
  domainOwnershipChallenge,
  normalizeHostname as normalizeDomainHostname,
} from "@factory/domains";
import { RemoteMediaProvider, type ProcessedMedia } from "@factory/media";
import { compilePublication, type DraftProjection } from "@factory/publication-compiler";
import {
  createPreviewToken,
  parseSnapshot,
  previewTokenHash,
  seoDocumentSchema,
  snapshotHash,
} from "@factory/publication-contract";
import type { JsonValue, TemplateDefinition } from "@factory/template-sdk";
import {
  discoverTemplates,
  loadCatalogedTemplateArtifact,
  loadTemplate,
  loadTemplateArtifact,
} from "@factory/template-loader";
import { instantiateTemplateRuntime } from "@factory/template-runtime";
import { requestPublication } from "@factory/publishing";
import { dashboardArtifactStore as artifactStore } from "@/server/artifact-store";
import { dashboardDatabase } from "@/server/overview";
import { requireDashboardContext, requireWebsiteMutationContext } from "@/server/auth";
import { hostedHostname, isHostnameConflict, localHostname } from "@/server/local-hostnames";
import { dashboardConfig, workspaceRoot } from "@/server/config";
import { heartbeatProcessId, processIsRunning, startLocalWorker } from "@/server/worker-control";
import { workerStatusFromHeartbeat } from "@/server/worker-status";
import { renewalResumeStatus } from "@/server/subscriptions";
import { defaultSubscriptionExpiry } from "@/server/subscription-dates";
import { isSupportedWebsiteLocale, websiteLanguageSelection } from "@/server/website-languages";
import { dashboardMediaPath, mediaStorageKey } from "@/server/media-storage";
import { supportedTemplateLocales } from "@/server/template-locales";
import { canReuseActivePublication } from "@/server/publication-toggle";
import {
  requestWebsitePublication,
  retryWebsitePublication,
  setWebsiteAvailability,
} from "@/server/actions/publication-actions";

const templatesRoot = resolve(workspaceRoot, dashboardConfig.FACTORY_TEMPLATE_DIRECTORY);

interface WebsiteForPublish {
  id: string;
  organizationId: string;
  name: string;
  templateId: string;
  templateVersion: string;
  defaultLocale: string;
  draftRevision: bigint;
  activePublicationId: string | null;
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

export async function createWebsiteAction(formData: FormData): Promise<void> {
  const name = cleanText(formData.get("name"), 120);
  const templateKey = cleanText(formData.get("template"), 260);
  const hostnameInput = cleanText(formData.get("hostname"), 80);
  const clientId = cleanText(formData.get("clientId"), 80) || null;
  const cadenceInput = cleanText(formData.get("subscriptionCadence"), 20);
  const cadence =
    cadenceInput === "trial" || cadenceInput === "monthly" || cadenceInput === "yearly"
      ? cadenceInput
      : null;
  const expiresOn = cleanText(formData.get("subscriptionExpiresAt"), 32);
  const languages = websiteLanguageSelection(
    cleanText(formData.get("languageMode"), 10),
    cleanText(formData.get("defaultLanguage"), 10),
  );
  if (!name || !templateKey || !languages) return;

  const [templateId, templateVersion] = templateKey.split("@");
  if (!templateId || !templateVersion) return;

  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.create");
  const organization = context.organization;
  const actorId = context.actor.id;
  const hostingDomainId = cleanText(formData.get("hostingDomainId"), 80);
  const hostingDomain = hostingDomainId
    ? await client.hostingDomain.findFirst({
        where: { id: hostingDomainId, organizationId: organization.id },
      })
    : null;
  const hostname = hostingDomain
    ? hostedHostname(hostnameInput || name, hostingDomain.hostnameNormalized)
    : localHostname(hostnameInput || name);
  if (!hostname) return;

  const candidate = (await discoverTemplates(templatesRoot)).find(
    (item) =>
      item.discovery.templateId === templateId &&
      item.discovery.templateVersion === templateVersion,
  );
  if (!candidate) return;
  const artifact = await loadTemplateArtifact(candidate);
  const template = artifact.definition;
  const catalogVersion = await client.templateVersionRecord.findUnique({
    where: { templateId_templateVersion: { templateId, templateVersion } },
    select: { artifactHash: true, lifecycleStatus: true, validationStatus: true },
  });
  if (
    !catalogVersion ||
    catalogVersion.lifecycleStatus !== "ready" ||
    catalogVersion.validationStatus !== "valid" ||
    catalogVersion.artifactHash !== artifact.artifactHash
  ) {
    redirect(templateUnavailableUrl());
  }
  const websiteId = randomUUID();
  const expiresAt = expiresOn
    ? parseSubscriptionExpiry(expiresOn)
    : cadence
      ? defaultSubscriptionExpiry(cadence)
      : null;
  if (cadenceInput && !cadence) return;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return;
  if (!cadence && expiresAt) return;
  if (expiresAt && expiresAt.getTime() <= Date.now()) return;

  const hostnameExists = await withTenantTransaction(
    client,
    {
      organizationId: organization.id,
      actorId,
      correlationId: `check-subdomain:${hostname}`,
    },
    (transaction) =>
      transaction.domain.findFirst({
        where: { hostnameNormalized: hostname, releasedAt: null },
        select: { id: true },
      }),
  );
  if (hostnameExists) redirect(subdomainUnavailableUrl(hostname));

  try {
    await withTenantTransaction(
      client,
      { organizationId: organization.id, actorId, correlationId: `create-website:${websiteId}` },
      async (transaction) => {
        if (clientId) {
          const assignedClient = await transaction.client.findUnique({
            where: { organizationId_id: { organizationId: organization.id, id: clientId } },
            select: { id: true },
          });
          if (!assignedClient) throw new Error("CLIENT_NOT_FOUND");
        }
        await transaction.website.create({
          data: {
            id: websiteId,
            organizationId: organization.id,
            clientId,
            name,
            status: "draft",
            templateId,
            templateVersion,
            defaultLocale: languages.defaultLocale,
          },
        });
        if (cadence && expiresAt) {
          await transaction.websiteSubscription.create({
            data: {
              id: randomUUID(),
              organizationId: organization.id,
              websiteId,
              clientId,
              cadence,
              startsAt: new Date(),
              expiresAt,
            },
          });
        }
        await transaction.websiteLocale.createMany({
          data: languages.locales.map((locale) => ({
            organizationId: organization.id,
            websiteId,
            locale,
            isDefault: locale === languages.defaultLocale,
            fallbackLocale: locale === languages.defaultLocale ? null : languages.defaultLocale,
          })),
        });
        const settings = template.websiteSchema.parse({});
        await transaction.websiteSettingsDraft.create({
          data: {
            id: randomUUID(),
            organizationId: organization.id,
            websiteId,
            locale: null,
            schemaVersion: template.websiteSchema.version,
            contentJson: jsonInput(settings),
            contentSizeBytes: Buffer.byteLength(JSON.stringify(settings)),
          },
        });
        await transaction.themeDraft.create({
          data: {
            id: randomUUID(),
            organizationId: organization.id,
            websiteId,
            locale: null,
            themeDefinitionId: template.theme.id,
            schemaVersion: template.theme.schemaVersion,
            tokensJson: jsonInput(template.theme.defaults),
            contentSizeBytes: Buffer.byteLength(JSON.stringify(template.theme.defaults)),
          },
        });
        await transaction.domain.create({
          data: {
            id: randomUUID(),
            organizationId: organization.id,
            websiteId,
            hostnameNormalized: hostname,
            hostnameDisplay: hostname,
            kind: "subdomain",
            status: "active",
          },
        });

        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: organization.id,
            actorType: "system",
            actorId,
            action: "website.created",
            resourceType: "website",
            resourceId: websiteId,
            correlationId: `create-website:${websiteId}`,
            metadataJson: jsonInput({
              templateId,
              templateVersion,
              hostname,
              locales: [...languages.locales],
              defaultLocale: languages.defaultLocale,
            }),
            retentionClass: "standard",
          },
        });

        const createdPages: {
          id: string;
          pageTypeId: string;
          title: string;
          locale: string;
        }[] = [];
        for (const locale of languages.locales) {
          for (const [pageIndex, page] of template.pages.entries()) {
            const pageId = randomUUID();
            const localizedTitle = localizedTemplateTitle(page.title, locale);
            createdPages.push({ id: pageId, pageTypeId: page.id, title: localizedTitle, locale });
            await transaction.pageDraft.create({
              data: {
                id: pageId,
                organizationId: organization.id,
                websiteId,
                pageTypeId: page.id,
                locale,
                title: localizedTitle,
                slug: page.slug.defaultValue ?? slugFromTitle(page.title),
                orderKey: String(pageIndex).padStart(4, "0"),
              },
            });
            const sections = page.defaultSections.flatMap((sectionSpec, sectionIndex) => {
              const definition = template.sections.find(
                (item) => item.id === sectionSpec.sectionTypeId,
              );
              return definition
                ? [
                    {
                      id: randomUUID(),
                      organizationId: organization.id,
                      websiteId,
                      pageId,
                      sectionTypeId: definition.id,
                      schemaVersion: definition.schema.version,
                      contentJson: jsonInput(
                        localizeTemplateDefault(sectionSpec.content ?? definition.defaults, locale),
                      ),
                      orderKey: String(sectionIndex).padStart(4, "0"),
                    },
                  ]
                : [];
            });
            if (sections.length > 0) {
              await transaction.sectionDraft.createMany({ data: sections });
            }
          }
        }

        for (const definition of template.navigation) {
          const navigationLocales =
            definition.localization === "localized-tree" ? languages.locales : [null];
          for (const navigationLocale of navigationLocales) {
            const navigationId = randomUUID();
            await transaction.navigationDraft.create({
              data: {
                id: navigationId,
                organizationId: organization.id,
                websiteId,
                definitionId: definition.id,
                locale: navigationLocale,
                visibilitySchemaVersion: definition.visibilitySchema.version,
              },
            });
            const pageLocale = navigationLocale ?? languages.defaultLocale;
            const eligiblePages = createdPages.filter(
              (page) =>
                page.locale === pageLocale &&
                (definition.allowedPageTypes === "all" ||
                  definition.allowedPageTypes.includes(page.pageTypeId as never)),
            );
            if (eligiblePages.length === 0) continue;
            await transaction.navigationNodeDraft.createMany({
              data: eligiblePages.map((page, index) => ({
                id: randomUUID(),
                organizationId: organization.id,
                websiteId,
                navigationId,
                parentNodeId: null,
                nodeKind: "page",
                pageId: page.id,
                labelJson: jsonInput(
                  Object.fromEntries(
                    languages.locales.map((locale) => [
                      locale,
                      localizedTemplateTitle(page.title, locale),
                    ]),
                  ),
                ),
                targetJson: jsonInput({ pageId: page.id }),
                visibilityJson: jsonInput(definition.visibilitySchema.parse({})),
                orderKey: String(index).padStart(4, "0"),
              })),
            });
          }
        }
      },
    );
  } catch (error) {
    if (isHostnameConflict(error)) redirect(subdomainUnavailableUrl(hostname));
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/websites");
  redirect(`/websites/${websiteId}`);
}

export async function deleteWebsiteAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  if (!websiteId) return;

  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.edit");
  const organization = context.organization;
  const actorId = context.actor.id;
  const correlationId = `delete-website:${websiteId}:${randomUUID()}`;

  const artifactUris = await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId, correlationId },
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: organization.id, id: websiteId } },
        select: {
          id: true,
          name: true,
          publications: {
            select: { id: true, artifacts: { select: { storageUri: true } } },
          },
          previewSnapshots: { select: { storageUri: true } },
          domains: { select: { id: true } },
          pages: { select: { sections: { select: { id: true } } } },
        },
      });
      if (!website) return [];

      const jobIds = (
        await transaction.job.findMany({
          where: {
            organizationId: organization.id,
            payloadJson: { path: ["websiteId"], equals: websiteId },
          },
          select: { id: true },
        })
      ).map((job) => job.id);
      const domainIds = website.domains.map((domain) => domain.id);
      const publicationIds = website.publications.map((publication) => publication.id);
      const sectionIds = website.pages.flatMap((page) =>
        page.sections.map((section) => section.id),
      );

      // Break the website/publication cycle before removing its dependent records.
      await transaction.website.update({
        where: { organizationId_id: { organizationId: organization.id, id: websiteId } },
        data: { activePublicationId: null },
      });

      await transaction.pluginInstallation.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.websiteClaim.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.outboundMessage.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.websiteSubscription.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      if (jobIds.length > 0) {
        await transaction.jobAttempt.deleteMany({ where: { jobId: { in: jobIds } } });
        await transaction.job.deleteMany({
          where: { id: { in: jobIds }, organizationId: organization.id },
        });
      }
      await transaction.outboxEvent.deleteMany({
        where: {
          organizationId: organization.id,
          aggregateType: "website",
          aggregateId: websiteId,
        },
      });

      if (domainIds.length > 0) {
        await transaction.domainVerificationAttempt.deleteMany({
          where: { organizationId: organization.id, domainId: { in: domainIds } },
        });
        await transaction.certificateBinding.deleteMany({
          where: { organizationId: organization.id, domainId: { in: domainIds } },
        });
      }
      await transaction.domain.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });

      await transaction.mediaReference.deleteMany({
        where: {
          organizationId: organization.id,
          OR: [
            { websiteId },
            ...(sectionIds.length > 0 ? [{ sectionId: { in: sectionIds } }] : []),
            ...(publicationIds.length > 0 ? [{ publicationId: { in: publicationIds } }] : []),
          ],
        },
      });
      await transaction.navigationNodeDraft.updateMany({
        where: { organizationId: organization.id, websiteId },
        data: { parentNodeId: null },
      });
      await transaction.navigationNodeDraft.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.navigationDraft.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.seoDraft.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.sectionDraft.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.pageDraft.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.themeDraft.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.websiteSettingsDraft.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.websiteLocale.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });

      await transaction.previewSnapshot.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.publicationActivation.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      if (publicationIds.length > 0) {
        await transaction.publicationArtifact.deleteMany({
          where: {
            organizationId: organization.id,
            publicationId: { in: publicationIds },
          },
        });
      }
      await transaction.publication.deleteMany({
        where: { organizationId: organization.id, websiteId },
      });
      await transaction.website.delete({
        where: { organizationId_id: { organizationId: organization.id, id: websiteId } },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: organization.id,
          actorType: "system",
          actorId,
          action: "website.deleted",
          resourceType: "website",
          resourceId: websiteId,
          correlationId,
          metadataJson: jsonInput({ name: website.name }),
          retentionClass: "standard",
        },
      });

      return [
        ...website.previewSnapshots.map((snapshot) => snapshot.storageUri),
        ...website.publications.flatMap((publication) =>
          publication.artifacts.map((artifact) => artifact.storageUri),
        ),
      ];
    },
  );

  await Promise.allSettled(
    [...new Set(artifactUris)].map((uri) => artifactStore.deleteOrphan(uri)),
  );
  revalidatePath("/");
  revalidatePath("/websites");
  revalidatePath("/domains");
  revalidatePath("/seo");
  redirect("/websites");
}

export async function restartWorkerAction(): Promise<void> {
  const context = await requireDashboardContext("operations.manage");
  if (dashboardConfig.FACTORY_DEPLOYMENT_MODE !== "local") {
    redirect("/websites?workerRestart=unavailable#publish-jobs");
  }

  const client = dashboardDatabase();
  const heartbeat = await client.serviceHeartbeat.findFirst({
    where: { service: "worker" },
    orderBy: { heartbeatAt: "desc" },
    select: { status: true, heartbeatAt: true, metadataJson: true },
  });
  const workerState = workerStatusFromHeartbeat(heartbeat).state;
  if (workerState === "online") {
    redirect("/websites?workerRestart=already-online#publish-jobs");
  }
  if (workerState === "starting") {
    redirect("/websites?workerRestart=already-starting#publish-jobs");
  }

  let outcome = "failed";
  const previousPid = heartbeatProcessId(heartbeat?.metadataJson);
  try {
    if (previousPid && processIsRunning(previousPid)) {
      process.kill(previousPid);
    }
    const startedAt = new Date();
    await client.serviceHeartbeat.upsert({
      where: { instanceId: "dashboard-local-worker-restart" },
      update: { status: "starting", heartbeatAt: startedAt, metadataJson: { previousPid } },
      create: {
        instanceId: "dashboard-local-worker-restart",
        service: "worker",
        status: "starting",
        metadataJson: { previousPid },
        startedAt,
        heartbeatAt: startedAt,
      },
    });
    const newPid = await startLocalWorker(workspaceRoot);
    await client.serviceHeartbeat.update({
      where: { instanceId: "dashboard-local-worker-restart" },
      data: { metadataJson: { previousPid, pid: newPid }, heartbeatAt: new Date() },
    });
    await withTenantTransaction(
      client,
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: `worker-restart:${newPid}:${randomUUID()}`,
      },
      (transaction) =>
        transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            actorType: "user",
            actorId: context.actor.id,
            action: "worker.restart_requested",
            resourceType: "worker",
            resourceId: String(newPid),
            correlationId: `worker-restart:${newPid}`,
            metadataJson: jsonInput({ previousPid, newPid }),
            retentionClass: "security",
          },
        }),
    );
    outcome = "started";
  } catch {
    await client.serviceHeartbeat.updateMany({
      where: { instanceId: "dashboard-local-worker-restart" },
      data: { status: "error", heartbeatAt: new Date() },
    });
    outcome = "failed";
  }

  revalidatePath("/websites");
  redirect(`/websites?workerRestart=${outcome}#publish-jobs`);
}

export async function publishWebsiteAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  if (!websiteId) return;
  const context = await requireDashboardContext("website.publish");
  await requestWebsitePublication(context, websiteId, `publish-website:${websiteId}`);

  revalidatePath("/");
}

export async function toggleWebsitePublicationAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  if (!websiteId) return;
  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.publish");
  const result = await withTenantTransaction(
    client,
    tenantActionContext(context, `toggle-publication:${websiteId}`),
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        include: {
          subscription: true,
          activePublication: { select: { status: true, sourceDraftRevision: true } },
        },
      });
      if (!website) return "missing" as const;
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
      return "queue" as const;
    },
  );
  if (result === "queue") {
    await requestPublication(
      new PrismaPublicationCommandRepository(client),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: `publish-update:${websiteId}`,
      },
      { websiteId },
    );
  }
  revalidateWebsiteEditor(websiteId);
}

/** Lets a client publish the current revision of only their own website. */
export async function publishClientWebsiteUpdateAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  if (!websiteId) return;
  const client = dashboardDatabase();
  const context = await requireWebsiteMutationContext(websiteId, "website.publish");
  const result = await withTenantTransaction(
    client,
    tenantActionContext(context, `publish-client-update:${websiteId}`),
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        include: {
          subscription: true,
          activePublication: { select: { status: true, sourceDraftRevision: true } },
        },
      });
      const hasPendingUpdate =
        website?.status === "published" &&
        website.activePublication !== null &&
        website.activePublication.sourceDraftRevision !== website.draftRevision;
      if (!website || !hasPendingUpdate) return "unchanged" as const;
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
      return "queue" as const;
    },
  );
  if (result === "queue") {
    await requestPublication(
      new PrismaPublicationCommandRepository(client),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: `publish-client-update:${websiteId}`,
      },
      { websiteId },
    );
  }
  revalidateWebsiteEditor(websiteId);
}

export async function retryPublicationJobAction(formData: FormData): Promise<void> {
  const jobId = cleanText(formData.get("jobId"), 80);
  if (!jobId) return;
  const context = await requireDashboardContext("website.publish");
  const result = await retryWebsitePublication(context, jobId);
  if (!result) return;
  revalidateWebsiteEditor(result);
}

export async function setWebsiteAvailabilityAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const requestedStatus = cleanText(formData.get("status"), 20);
  if (!websiteId || !["unpublished", "disabled"].includes(requestedStatus)) return;
  const context = await requireDashboardContext("website.publish");
  const status = requestedStatus as "unpublished" | "disabled";
  await setWebsiteAvailability(context, websiteId, status);
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
}

export async function updateWebsiteIdentityAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const name = cleanText(formData.get("name"), 200);
  if (!websiteId || !name) return;
  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `website-identity:${websiteId}`),
    async (transaction) => {
      const result = await transaction.website.updateMany({
        where: { id: websiteId, organizationId: context.organization.id, archivedAt: null },
        data: {
          name,
          draftRevision: { increment: 1 },
          revision: { increment: 1 },
        },
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
          correlationId: `website-identity:${websiteId}`,
          metadataJson: jsonInput({ name }),
          retentionClass: "standard",
        },
      });
    },
  );
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
}

export async function createWebsiteClaimLinkAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const requestedEmail = cleanText(formData.get("intendedEmail"), 320).toLowerCase() || null;
  if (!websiteId) return;
  const context = await requireDashboardContext("website.edit");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `website-claim:${websiteId}`),
    async (transaction) => {
      const website = await transaction.website.findFirst({
        where: {
          id: websiteId,
          organizationId: context.organization.id,
          archivedAt: null,
        },
        select: {
          id: true,
          name: true,
          clientId: true,
          client: { select: { contactEmail: true } },
        },
      });
      if (!website) throw new Error("WEBSITE_NOT_FOUND");
      const assignedEmail = website.client?.contactEmail?.trim().toLowerCase() || null;
      if (assignedEmail && requestedEmail && assignedEmail !== requestedEmail) {
        throw new Error("CLAIM_EMAIL_MUST_MATCH_ASSIGNED_CLIENT");
      }
      const intendedEmail = assignedEmail ?? requestedEmail;
      if (website.clientId && !intendedEmail) throw new Error("CLIENT_EMAIL_REQUIRED");
      await transaction.websiteClaim.updateMany({
        where: { organizationId: context.organization.id, websiteId, status: "pending" },
        data: { status: "revoked" },
      });
      await transaction.websiteClaim.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          websiteId,
          tokenHash,
          intendedEmail,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1_000),
        },
      });
      if (intendedEmail) {
        const claimUrl = new URL(
          `/dashboard/claim/${token}`,
          dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL,
        ).toString();
        await transaction.outboundMessage.upsert({
          where: { websiteId_kind: { websiteId, kind: "website.claim" } },
          update: {
            recipientEmail: intendedEmail,
            subject: `Claim ownership of ${website.name}`,
            bodyText: `You have been invited to claim ownership of ${website.name}. Open this secure link within 14 days: ${claimUrl}`,
            status: "queued",
            scheduledFor: new Date(),
            availableAt: new Date(),
            attemptCount: 0,
            sentAt: null,
            failureReason: null,
          },
          create: {
            id: randomUUID(),
            organizationId: context.organization.id,
            websiteId,
            recipientEmail: intendedEmail,
            subject: `Claim ownership of ${website.name}`,
            bodyText: `You have been invited to claim ownership of ${website.name}. Open this secure link within 14 days: ${claimUrl}`,
            kind: "website.claim",
          },
        });
      }
    },
  );
  redirect(`/websites/${websiteId}?claimLink=${encodeURIComponent(`/claim/${token}`)}`);
}

export async function updateWebsiteBrandingAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const faviconAssetId = cleanText(formData.get("faviconAssetId"), 80) || null;
  const updatesWhiteLabel = formData.has("updatesWhiteLabel") || formData.has("whiteLabelEnabled");
  const whiteLabelEnabled = formData.has("updatesWhiteLabel")
    ? formData.get("showWatermark") !== "on"
    : formData.get("whiteLabelEnabled") === "on";
  if (!websiteId) return;
  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `website-branding:${websiteId}`),
    async (transaction) => {
      if (faviconAssetId) {
        const favicon = await transaction.mediaAsset.findFirst({
          where: {
            id: faviconAssetId,
            organizationId: context.organization.id,
            status: "ready",
            kind: "image",
          },
          select: { id: true },
        });
        if (!favicon) throw new Error("FAVICON_ASSET_NOT_READY");
      }
      const result = await transaction.website.updateMany({
        where: { id: websiteId, organizationId: context.organization.id, archivedAt: null },
        data: {
          faviconAssetId,
          ...(updatesWhiteLabel ? { whiteLabelEnabled } : {}),
          draftRevision: { increment: 1 },
          revision: { increment: 1 },
        },
      });
      if (result.count !== 1) throw new Error("WEBSITE_NOT_FOUND");
      await transaction.mediaReference.deleteMany({
        where: { organizationId: context.organization.id, websiteId, referenceKind: "favicon" },
      });
      if (faviconAssetId) {
        await transaction.mediaReference.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            mediaAssetId: faviconAssetId,
            websiteId,
            referenceKind: "favicon",
            jsonPointer: "/website/favicon",
          },
        });
      }
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function updateWebsiteLogoAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const logoMediaId = cleanText(formData.get("logoMediaId"), 80) || null;
  if (!websiteId) return;
  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `website-logo:${websiteId}`),
    async (transaction) => {
      if (logoMediaId) {
        const logo = await transaction.mediaAsset.findFirst({
          where: {
            id: logoMediaId,
            organizationId: context.organization.id,
            status: "ready",
            kind: "image",
          },
          select: { id: true },
        });
        if (!logo) throw new Error("LOGO_ASSET_NOT_READY");
      }
      const settings = await transaction.websiteSettingsDraft.findFirst({
        where: { organizationId: context.organization.id, websiteId, locale: null },
        orderBy: { createdAt: "asc" },
      });
      if (!settings) throw new Error("WEBSITE_SETTINGS_NOT_FOUND");
      const current =
        settings.contentJson &&
        typeof settings.contentJson === "object" &&
        !Array.isArray(settings.contentJson)
          ? settings.contentJson
          : {};
      const content = { ...current, logoMediaId };
      await transaction.websiteSettingsDraft.update({
        where: { id: settings.id },
        data: {
          contentJson: jsonInput(content),
          contentSizeBytes: Buffer.byteLength(JSON.stringify(content)),
          revision: { increment: 1 },
        },
      });
      await transaction.website.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        data: { draftRevision: { increment: 1 }, revision: { increment: 1 } },
      });
      await transaction.mediaReference.deleteMany({
        where: {
          organizationId: context.organization.id,
          websiteId,
          referenceKind: "website_logo",
        },
      });
      if (logoMediaId) {
        await transaction.mediaReference.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            mediaAssetId: logoMediaId,
            websiteId,
            referenceKind: "website_logo",
            jsonPointer: "/settings/logoMediaId",
          },
        });
      }
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function updateWebsiteAppearanceAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const colorMode = cleanText(formData.get("colorMode"), 12);
  if (!websiteId || (colorMode !== "light" && colorMode !== "dark")) return;
  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `website-appearance:${websiteId}`),
    async (transaction) => {
      const settings = await transaction.websiteSettingsDraft.findFirst({
        where: { organizationId: context.organization.id, websiteId, locale: null },
        orderBy: { createdAt: "asc" },
      });
      if (!settings) throw new Error("WEBSITE_SETTINGS_NOT_FOUND");
      const current =
        settings.contentJson &&
        typeof settings.contentJson === "object" &&
        !Array.isArray(settings.contentJson)
          ? settings.contentJson
          : {};
      const content = { ...current, colorMode };
      await transaction.websiteSettingsDraft.update({
        where: { id: settings.id },
        data: {
          contentJson: jsonInput(content),
          contentSizeBytes: Buffer.byteLength(JSON.stringify(content)),
          revision: { increment: 1 },
        },
      });
      await transaction.website.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        data: { draftRevision: { increment: 1 }, revision: { increment: 1 } },
      });
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function saveWebsiteSubscriptionAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const clientId = cleanText(formData.get("clientId"), 80) || null;
  const cadenceInput = cleanText(formData.get("cadence"), 20);
  const expiresOn = cleanText(formData.get("expiresAt"), 32);
  const cadence =
    cadenceInput === "trial" || cadenceInput === "monthly" || cadenceInput === "yearly"
      ? cadenceInput
      : null;
  const expiresAt = parseSubscriptionExpiry(expiresOn);
  if (!websiteId || !cadence || !expiresAt || Number.isNaN(expiresAt.getTime())) return;
  if (expiresAt.getTime() <= Date.now()) throw new Error("SUBSCRIPTION_EXPIRY_MUST_BE_FUTURE");
  const context = await requireDashboardContext("website.edit");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `website-subscription:${websiteId}`),
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        select: { id: true },
      });
      if (!website) throw new Error("WEBSITE_NOT_FOUND");
      if (clientId) {
        const assignedClient = await transaction.client.findUnique({
          where: { organizationId_id: { organizationId: context.organization.id, id: clientId } },
          select: { id: true },
        });
        if (!assignedClient) throw new Error("CLIENT_NOT_FOUND");
      }
      await transaction.website.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        data: { clientId, revision: { increment: 1 } },
      });
      const existingSubscription = await transaction.websiteSubscription.findUnique({
        where: { organizationId_websiteId: { organizationId: context.organization.id, websiteId } },
        select: { disabledReason: true, resumeStatus: true },
      });
      await transaction.websiteSubscription.upsert({
        where: { organizationId_websiteId: { organizationId: context.organization.id, websiteId } },
        create: {
          id: randomUUID(),
          organizationId: context.organization.id,
          websiteId,
          clientId,
          cadence,
          startsAt: new Date(),
          expiresAt,
        },
        update: {
          clientId,
          cadence,
          status: "active",
          startsAt: new Date(),
          expiresAt,
          disabledAt: null,
          disabledReason: null,
          resumeStatus: null,
        },
      });
      if (existingSubscription?.disabledReason === "subscription_expired") {
        await transaction.website.updateMany({
          where: { id: websiteId, organizationId: context.organization.id, status: "disabled" },
          data: {
            status: renewalResumeStatus(existingSubscription.resumeStatus),
            revision: { increment: 1 },
          },
        });
      }
    },
  );
  revalidatePath("/billing");
  revalidatePath("/clients");
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
}

export async function previewWebsiteAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  if (!websiteId) return;
  const previewUrl = await createWebsiteDraftPreviewAction(websiteId);
  if (previewUrl) redirect(previewUrl);
}

export async function createWebsiteDraftPreviewAction(
  websiteIdInput: string,
): Promise<string | null> {
  const websiteId = cleanText(websiteIdInput, 80);
  if (!websiteId) return null;
  const client = dashboardDatabase();
  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  await enforceRateLimit(client, `preview:${context.organization.id}:${context.actor.id}`, 30, 60);
  const organization = context.organization;
  const actorId = context.actor.id;

  const data = await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId, correlationId: `preview-website:${websiteId}` },
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: organization.id, id: websiteId } },
        include: {
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
          organizationId: organization.id,
          websiteId,
          asset: { status: "ready" },
        },
        include: { asset: { include: { variants: true } } },
      });
      return { ...website, mediaReferences };
    },
  );
  if (!data) return null;

  const catalogVersion = await client.templateVersionRecord.findUnique({
    where: {
      templateId_templateVersion: {
        templateId: data.templateId,
        templateVersion: data.templateVersion,
      },
    },
    select: {
      artifactHash: true,
      artifactUri: true,
      lifecycleStatus: true,
      validationStatus: true,
    },
  });
  if (
    !catalogVersion ||
    catalogVersion.validationStatus !== "valid" ||
    !["ready", "deprecated"].includes(catalogVersion.lifecycleStatus)
  ) {
    return null;
  }
  const artifact = await loadCatalogedTemplateArtifact(templatesRoot, catalogVersion.artifactUri, {
    templateId: data.templateId,
    templateVersion: data.templateVersion,
  });
  if (artifact.artifactHash !== catalogVersion.artifactHash) return null;
  const template = artifact.definition;
  const previewId = randomUUID();
  const result = compilePublication(
    toDraftProjection(data, previewId, template),
    template,
    artifact.artifactHash,
    artifact.manifest.manifestHash,
  );
  if (!result.success) return null;

  const runtime = instantiateTemplateRuntime(
    {
      definition: template,
      artifactHash: artifact.artifactHash,
      manifestHash: artifact.manifest.manifestHash,
    },
    result.snapshot,
  );
  for (const route of result.snapshot.routes) {
    const rendered = runtime.render(route.pathname);
    if (rendered.node === undefined) throw new Error("PREVIEW_RENDER_EMPTY");
  }

  const stored = await artifactStore.putImmutable(previewId, result.snapshot);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const secret = dashboardConfig.PREVIEW_SIGNING_SECRET;
  const now = Math.floor(Date.now() / 1_000);
  const token = createPreviewToken(
    {
      previewId,
      organizationId: organization.id,
      websiteId,
      issuedAt: now,
      expiresAt: Math.floor(expiresAt.getTime() / 1_000),
      nonce: randomBytes(32).toString("hex"),
    },
    secret,
  );

  try {
    await withTenantTransaction(
      client,
      { organizationId: organization.id, actorId, correlationId: `preview-created:${previewId}` },
      async (transaction) => {
        await transaction.previewSnapshot.create({
          data: {
            id: previewId,
            organizationId: organization.id,
            websiteId,
            publicationId: null,
            snapshotSchemaVersion: result.snapshot.snapshotVersion,
            storageUri: stored.uri,
            contentHash: stored.hash,
            sourceDraftRevision: data.draftRevision,
            expiresAt,
            tokenHash: previewTokenHash(token),
          },
        });
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: organization.id,
            actorType: "system",
            actorId,
            action: "preview.created",
            resourceType: "website",
            resourceId: websiteId,
            correlationId: `preview-created:${previewId}`,
            metadataJson: jsonInput({ previewId, expiresAt: expiresAt.toISOString() }),
            retentionClass: "standard",
          },
        });
      },
    );
  } catch (error) {
    await artifactStore.deleteOrphan(stored.uri).catch(() => undefined);
    throw error;
  }

  const gatewayUrl = new URL("/preview/", dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL);
  gatewayUrl.searchParams.set("token", token);
  return gatewayUrl.toString();
}

export async function rollbackPublicationAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const publicationId = cleanText(formData.get("publicationId"), 80);
  if (!websiteId || !publicationId) return;

  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.publish");
  const organization = context.organization;
  const actorId = context.actor.id;

  const rollbackTarget = await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId, correlationId: `rollback-check:${publicationId}` },
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: organization.id, id: websiteId } },
        select: { activePublicationId: true, revision: true },
      });
      if (!website || website.activePublicationId === publicationId) return null;

      const publication = await transaction.publication.findFirst({
        where: {
          id: publicationId,
          organizationId: organization.id,
          websiteId,
          status: "ready",
        },
        include: { artifacts: { where: { artifactKind: "snapshot" }, take: 1 } },
      });
      if (!publication || publication.artifacts.length !== 1) return null;
      return {
        publication,
        previousPublicationId: website.activePublicationId,
      };
    },
  );
  if (!rollbackTarget) return;

  const snapshot = await verifyRollbackArtifact(
    rollbackTarget.publication.artifacts[0]!.storageUri,
    rollbackTarget.publication.artifacts[0]!.contentHash,
    organization.id,
    websiteId,
    publicationId,
    rollbackTarget.publication.templateId,
    rollbackTarget.publication.templateVersion,
  );
  const templateCandidate = (await discoverTemplates(templatesRoot)).find(
    (item) =>
      item.discovery.templateId === snapshot.template.id &&
      item.discovery.templateVersion === snapshot.template.version,
  );
  if (!templateCandidate) throw new Error("ROLLBACK_TEMPLATE_UNAVAILABLE");
  const rollbackArtifact = await loadTemplateArtifact(templateCandidate);
  if (
    rollbackArtifact.artifactHash !== snapshot.template.artifactHash ||
    rollbackArtifact.manifest.manifestHash !== snapshot.template.manifestHash
  )
    throw new Error("ROLLBACK_TEMPLATE_INTEGRITY_FAILED");

  const correlationId = `rollback-publication:${websiteId}:${randomUUID()}`;
  await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId, correlationId },
    async (transaction) => {
      const target = await transaction.publication.findFirst({
        where: {
          id: publicationId,
          organizationId: organization.id,
          websiteId,
          status: "ready",
        },
        select: { id: true },
      });
      if (!target) throw new Error("ROLLBACK_TARGET_NOT_READY");

      const currentWebsite = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: organization.id, id: websiteId } },
        select: { activePublicationId: true, revision: true },
      });
      if (
        !currentWebsite ||
        currentWebsite.activePublicationId !== rollbackTarget.previousPublicationId
      ) {
        throw new Error("ROLLBACK_CONCURRENT_ACTIVATION");
      }

      const switched = await transaction.website.updateMany({
        where: {
          id: websiteId,
          organizationId: organization.id,
          activePublicationId: currentWebsite.activePublicationId,
          revision: currentWebsite.revision,
        },
        data: {
          activePublicationId: publicationId,
          status: "published",
          revision: { increment: 1 },
        },
      });
      if (switched.count !== 1) throw new Error("ROLLBACK_CONCURRENT_ACTIVATION");

      await transaction.publicationActivation.create({
        data: {
          id: randomUUID(),
          organizationId: organization.id,
          websiteId,
          publicationId,
          activationKind: "rollback",
          previousPublicationId: rollbackTarget.previousPublicationId,
          actorId,
          correlationId,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          organizationId: organization.id,
          eventType: "WebsiteRolledBack",
          eventVersion: 1,
          aggregateType: "website",
          aggregateId: websiteId,
          aggregateRevision: currentWebsite.revision + 1n,
          payloadJson: jsonInput({
            websiteId,
            publicationId,
            previousPublicationId: rollbackTarget.previousPublicationId,
          }),
          correlationId,
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: organization.id,
          actorType: "system",
          actorId,
          action: "website.rolled_back",
          resourceType: "website",
          resourceId: websiteId,
          correlationId,
          metadataJson: jsonInput({
            publicationId,
            previousPublicationId: rollbackTarget.previousPublicationId,
          }),
          retentionClass: "standard",
        },
      });
    },
  );

  revalidatePath("/");
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
}

export async function prepareClientPortalAction(formData: FormData): Promise<void> {
  const clientId = cleanText(formData.get("clientId"), 80);
  if (!clientId) return;
  const context = await requireDashboardContext("client.create");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `prepare-client-portal:${clientId}`),
    async (transaction) => {
      const client = await transaction.client.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: clientId } },
        select: { contactEmail: true, archivedAt: true },
      });
      if (!client || client.archivedAt || !client.contactEmail) {
        throw new Error("CLIENT_EMAIL_REQUIRED");
      }
      const membership = await ensureClientPortalMembership(
        transaction,
        context.organization.id,
        context.actor.id,
        client.contactEmail,
      );
      await transaction.outboundMessage.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          clientId,
          recipientEmail: client.contactEmail,
          subject: `Your ${context.organization.name} client portal`,
          bodyText: `${membership.active ? "Your client portal access is ready." : "You have been invited to the client portal."} Sign in with ${client.contactEmail} at ${dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL}/api/auth/start to view your websites and billing information.`,
          kind: "client.portal_invitation",
        },
      });
    },
  );
  revalidatePath("/clients");
  revalidatePath("/mail");
}

async function ensureClientPortalMembership(
  transaction: DatabaseTransaction,
  organizationId: string,
  actorId: string,
  email: string,
): Promise<{ readonly id: string; readonly active: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await transaction.user.findUnique({
    where: { normalizedEmail },
    select: { id: true },
  });
  const role = await transaction.role.upsert({
    where: { organizationId_key: { organizationId, key: "client" } },
    create: {
      id: randomUUID(),
      organizationId,
      key: "client",
      name: "Client portal",
      isSystem: true,
    },
    update: { name: "Client portal", isSystem: true },
    select: { id: true },
  });
  let membership = user
    ? await transaction.membership.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        select: { id: true, status: true },
      })
    : await transaction.membership.findFirst({
        where: {
          organizationId,
          userId: null,
          status: "invited",
          invitedEmail: { equals: normalizedEmail, mode: "insensitive" },
        },
        select: { id: true, status: true },
      });
  membership ??= await transaction.membership.create({
    data: {
      id: randomUUID(),
      organizationId,
      userId: user?.id ?? null,
      status: user ? "active" : "invited",
      invitedEmail: user ? null : normalizedEmail,
    },
    select: { id: true, status: true },
  });
  await transaction.membershipRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId: role.id } },
    create: {
      organizationId,
      membershipId: membership.id,
      roleId: role.id,
    },
    update: {},
  });
  await transaction.auditEvent.create({
    data: {
      id: randomUUID(),
      organizationId,
      actorType: "user",
      actorId,
      action: "client.portal_access_prepared",
      resourceType: "membership",
      resourceId: membership.id,
      correlationId: `client-portal:${membership.id}`,
      metadataJson: jsonInput({ email: normalizedEmail, active: membership.status === "active" }),
      retentionClass: "security",
    },
  });
  return { id: membership.id, active: membership.status === "active" };
}

export async function queueClientMessageAction(formData: FormData): Promise<void> {
  const clientId = cleanText(formData.get("clientId"), 80);
  const subject = cleanText(formData.get("subject"), 240);
  const bodyText = cleanText(formData.get("bodyText"), 20_000);
  const kindInput = cleanText(formData.get("kind"), 40);
  const kind = kindInput === "support" || kindInput === "update" ? kindInput : "general";
  if (!clientId || !subject || !bodyText) return;
  const context = await requireDashboardContext("client.create");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `client-message:${clientId}`),
    async (transaction) => {
      const client = await transaction.client.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: clientId } },
        select: { contactEmail: true },
      });
      if (!client?.contactEmail) throw new Error("CLIENT_EMAIL_REQUIRED");
      await transaction.outboundMessage.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          clientId,
          recipientEmail: client.contactEmail,
          subject,
          bodyText,
          kind: `client.${kind}`,
        },
      });
    },
  );
  revalidatePath("/mail");
}

export async function createHostingDomainAction(formData: FormData): Promise<void> {
  const input = cleanText(formData.get("hostname"), 253);
  if (!input) return;
  let hostname: string;
  try {
    hostname = normalizeDomainHostname(input);
  } catch {
    return;
  }
  const context = await requireDashboardContext("domain.create");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `hosting-domain-create:${hostname}`),
    async (transaction) => {
      const existingDefault = await transaction.hostingDomain.findFirst({
        where: { organizationId: context.organization.id, isDefault: true },
        select: { id: true },
      });
      await transaction.hostingDomain.upsert({
        where: {
          organizationId_hostnameNormalized: {
            organizationId: context.organization.id,
            hostnameNormalized: hostname,
          },
        },
        create: {
          id: randomUUID(),
          organizationId: context.organization.id,
          hostnameNormalized: hostname,
          hostnameDisplay: input,
          isDefault: !existingDefault,
        },
        update: { hostnameDisplay: input },
      });
    },
  );
  revalidatePath("/domains");
  revalidatePath("/websites");
}

export async function setDefaultHostingDomainAction(formData: FormData): Promise<void> {
  const domainId = cleanText(formData.get("domainId"), 80);
  if (!domainId) return;
  const context = await requireDashboardContext("domain.create");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `hosting-domain-default:${domainId}`),
    async (transaction) => {
      const domain = await transaction.hostingDomain.findFirst({
        where: { id: domainId, organizationId: context.organization.id },
      });
      if (!domain) return;
      await transaction.hostingDomain.updateMany({
        where: { organizationId: context.organization.id },
        data: { isDefault: false },
      });
      await transaction.hostingDomain.update({
        where: { id: domain.id },
        data: { isDefault: true },
      });
    },
  );
  revalidatePath("/domains");
  revalidatePath("/websites");
}

export async function deleteHostingDomainAction(formData: FormData): Promise<void> {
  const domainId = cleanText(formData.get("domainId"), 80);
  if (!domainId) return;
  const context = await requireDashboardContext("domain.create");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `hosting-domain-delete:${domainId}`),
    async (transaction) => {
      const domain = await transaction.hostingDomain.findFirst({
        where: { id: domainId, organizationId: context.organization.id },
      });
      if (!domain) return;
      await transaction.hostingDomain.delete({ where: { id: domain.id } });
      if (!domain.isDefault) return;
      const replacement = await transaction.hostingDomain.findFirst({
        where: { organizationId: context.organization.id },
        orderBy: { createdAt: "asc" },
      });
      if (replacement) {
        await transaction.hostingDomain.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    },
  );
  revalidatePath("/domains");
  revalidatePath("/websites");
}

export async function createDomainAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const requestedHostname = cleanText(formData.get("hostname"), 253);
  if (!websiteId || !requestedHostname) return;

  const localHostname = requestedHostname.includes(".")
    ? requestedHostname
    : `${requestedHostname}.localhost`;
  let hostname: string;
  try {
    hostname = normalizeDomainHostname(localHostname);
  } catch {
    return;
  }
  const isLocal = hostname === "localhost" || hostname.endsWith(".localhost");
  const context = await requireDashboardContext("domain.create");
  const domainId = randomUUID();
  const verificationAttemptId = isLocal ? null : randomUUID();
  const challenge = isLocal
    ? null
    : domainOwnershipChallenge(
        verificationAttemptId!,
        dashboardConfig.FACTORY_DOMAIN_CHALLENGE_SECRET ?? dashboardConfig.PREVIEW_SIGNING_SECRET,
      );
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `create-domain:${domainId}`,
    },
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: {
          organizationId_id: { organizationId: context.organization.id, id: websiteId },
        },
        select: { id: true },
      });
      if (!website) return;
      await transaction.domain.create({
        data: {
          id: domainId,
          organizationId: context.organization.id,
          websiteId,
          hostnameNormalized: hostname,
          hostnameDisplay: hostname,
          kind: isLocal ? "subdomain" : "custom",
          status: isLocal ? "active" : "verifying",
        },
      });
      if (challenge) {
        await transaction.domainVerificationAttempt.create({
          data: {
            id: verificationAttemptId!,
            organizationId: context.organization.id,
            domainId,
            challengeKind: "dns_txt",
            challengeValueHash: domainChallengeHash(challenge),
            status: "pending",
          },
        });
        await transaction.job.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            type: "domain.verify",
            version: 1,
            payloadJson: jsonInput({ domainId }),
            status: "queued",
            priority: 5,
            maxAttempts: 40,
            deduplicationKey: `domain.verify:${domainId}`,
            correlationId: `verify-domain:${domainId}`,
          },
        });
      }
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "domain.created",
          resourceType: "domain",
          resourceId: domainId,
          correlationId: `create-domain:${domainId}`,
          metadataJson: jsonInput({ websiteId, hostname, kind: isLocal ? "subdomain" : "custom" }),
          retentionClass: "standard",
        },
      });
    },
  );
  revalidatePath("/");
  revalidatePath("/domains");
  revalidatePath("/websites");
}

export async function verifyDomainAction(formData: FormData): Promise<void> {
  const domainId = cleanText(formData.get("domainId"), 80);
  if (!domainId) return;
  const context = await requireDashboardContext("domain.create");
  await enforceRateLimit(
    dashboardDatabase(),
    `domain-verify:${context.organization.id}:${domainId}`,
    6,
    60,
  );
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `verify-domain:${domainId}`,
    },
    async (transaction) => {
      const domain = await transaction.domain.findFirst({
        where: {
          id: domainId,
          organizationId: context.organization.id,
          kind: "custom",
          releasedAt: null,
        },
        select: { id: true },
      });
      if (!domain) return;
      await transaction.domain.update({
        where: { id: domainId },
        data: { status: "verifying", revision: { increment: 1 } },
      });
      const existingJob = await transaction.job.findFirst({
        where: {
          organizationId: context.organization.id,
          deduplicationKey: `domain.verify:${domainId}`,
        },
        select: { id: true },
      });
      if (existingJob) {
        await transaction.job.update({
          where: { id: existingJob.id },
          data: {
            status: "queued",
            availableAt: new Date(),
            attemptCount: 0,
            completedAt: null,
            lockedAt: null,
            lockOwner: null,
            lockExpiresAt: null,
          },
        });
      } else {
        await transaction.job.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            type: "domain.verify",
            version: 1,
            payloadJson: jsonInput({ domainId }),
            status: "queued",
            priority: 5,
            maxAttempts: 40,
            deduplicationKey: `domain.verify:${domainId}`,
            correlationId: `verify-domain:${domainId}`,
          },
        });
      }
    },
  );
  revalidatePath("/domains");
}

export async function rotateDomainChallengeAction(formData: FormData): Promise<void> {
  const domainId = cleanText(formData.get("domainId"), 80);
  if (!domainId) return;
  const context = await requireDashboardContext("domain.create");
  const attemptId = randomUUID();
  const challenge = domainOwnershipChallenge(
    attemptId,
    dashboardConfig.FACTORY_DOMAIN_CHALLENGE_SECRET ?? dashboardConfig.PREVIEW_SIGNING_SECRET,
  );
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `rotate-domain-challenge:${domainId}`,
    },
    async (transaction) => {
      const domain = await transaction.domain.findFirst({
        where: {
          id: domainId,
          organizationId: context.organization.id,
          kind: "custom",
          releasedAt: null,
        },
        select: { id: true },
      });
      if (!domain) return;
      await transaction.domainVerificationAttempt.create({
        data: {
          id: attemptId,
          organizationId: context.organization.id,
          domainId,
          challengeKind: "dns_txt",
          challengeValueHash: domainChallengeHash(challenge),
          status: "pending",
        },
      });
      await transaction.domain.update({
        where: { id: domainId },
        data: { status: "verifying", revision: { increment: 1 } },
      });
      const jobs = await transaction.job.findMany({
        where: {
          organizationId: context.organization.id,
          deduplicationKey: `domain.verify:${domainId}`,
        },
        select: { id: true },
      });
      if (jobs.length > 0) {
        await transaction.jobAttempt.deleteMany({
          where: { jobId: { in: jobs.map((job) => job.id) } },
        });
        await transaction.job.deleteMany({ where: { id: { in: jobs.map((job) => job.id) } } });
      }
      await transaction.job.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          type: "domain.verify",
          version: 1,
          payloadJson: jsonInput({ domainId }),
          status: "queued",
          priority: 5,
          maxAttempts: 40,
          deduplicationKey: `domain.verify:${domainId}`,
          correlationId: `verify-domain:${domainId}`,
        },
      });
    },
  );
  revalidatePath("/domains");
}

export async function releaseDomainAction(formData: FormData): Promise<void> {
  const domainId = cleanText(formData.get("domainId"), 80);
  if (!domainId) return;
  const context = await requireDashboardContext("domain.create");
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `release-domain:${domainId}`,
    },
    async (transaction) => {
      const domain = await transaction.domain.findFirst({
        where: { id: domainId, organizationId: context.organization.id, releasedAt: null },
        include: { certificateBindings: { take: 1 } },
      });
      if (!domain) return;
      await transaction.domain.update({
        where: { id: domainId },
        data: {
          status: "disconnected",
          ...(domain.kind === "subdomain" || domain.certificateBindings.length === 0
            ? { releasedAt: new Date() }
            : {}),
          revision: { increment: 1 },
        },
      });
      if (domain.kind === "custom" && domain.certificateBindings.length > 0) {
        await transaction.job.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            type: "domain.disconnect",
            version: 1,
            payloadJson: jsonInput({ domainId }),
            status: "queued",
            priority: 20,
            maxAttempts: 10,
            deduplicationKey: `domain.disconnect:${domainId}`,
            correlationId: `release-domain:${domainId}`,
          },
        });
      }
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "domain.release_requested",
          resourceType: "domain",
          resourceId: domainId,
          correlationId: `release-domain:${domainId}`,
          metadataJson: jsonInput({ hostname: domain.hostnameNormalized }),
          retentionClass: "standard",
        },
      });
    },
  );
  revalidatePath("/");
  revalidatePath("/domains");
  revalidatePath("/websites");
}

export async function createMediaFolderAction(formData: FormData): Promise<void> {
  const name = cleanText(formData.get("name"), 160);
  if (!name) return;
  const context = await requireDashboardContext("media.create");
  const folderId = randomUUID();
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `create-media-folder:${folderId}`,
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
          correlationId: `create-media-folder:${folderId}`,
          metadataJson: jsonInput({ name }),
          retentionClass: "standard",
        },
      });
    },
  );
  revalidatePath("/media");
}

export async function uploadMediaAction(formData: FormData): Promise<void> {
  await uploadMedia(formData);
}

export async function uploadMediaForPickerAction(
  formData: FormData,
): Promise<{ assetId: string; url: string } | null> {
  const assetId = await uploadMedia(formData);
  return assetId ? { assetId, url: dashboardMediaPath(assetId) } : null;
}

export async function uploadDocumentForImportAction(formData: FormData): Promise<{
  assetId: string;
  extractedText: string;
  filename: string;
  pageCount: number;
  warning?: string;
} | null> {
  const upload = formData.get("file");
  if (!(upload instanceof File) || upload.type !== "application/pdf") return null;
  const bytes = Buffer.from(await upload.arrayBuffer());
  const assetId = await uploadMedia(formData);
  if (!assetId) return null;

  try {
    const { default: parsePdf } = await import("pdf-parse");
    const parsed = await parsePdf(bytes, { max: 50 });
    const extractedText = normalizeExtractedPdfText(parsed.text).slice(0, 40_000);
    return {
      assetId,
      extractedText,
      filename: upload.name.slice(0, 255) || "menu.pdf",
      pageCount: parsed.numpages,
      ...(extractedText
        ? {}
        : {
            warning:
              "The PDF was uploaded, but it appears to contain scanned images rather than selectable text. Review it manually and enter the menu items below.",
          }),
    };
  } catch {
    return {
      assetId,
      extractedText: "",
      filename: upload.name.slice(0, 255) || "menu.pdf",
      pageCount: 0,
      warning:
        "The PDF is stored safely, but automatic text extraction was not possible. Use it as a reference while building the menu manually.",
    };
  }
}

function normalizeExtractedPdfText(value: string): string {
  return value
    .replaceAll("\u0000", "")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function uploadMedia(formData: FormData): Promise<string | undefined> {
  const upload = formData.get("file");
  let folderId = cleanText(formData.get("folderId"), 80);
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const purposeInput = cleanText(formData.get("purpose"), 24);
  const purpose = purposeInput === "favicon" || purposeInput === "logo" ? purposeInput : null;
  if (
    !(upload instanceof File) ||
    upload.size < 1 ||
    upload.size > dashboardConfig.FACTORY_MAX_UPLOAD_BYTES
  )
    return;
  const context = websiteId
    ? await requireWebsiteMutationContext(websiteId, "media.create")
    : await requireDashboardContext("media.create");
  if (websiteId && context.roleKeys.includes("client")) folderId = "";
  await enforceRateLimit(
    dashboardDatabase(),
    `media-upload:${context.organization.id}:${context.actor.id}`,
    20,
    60,
  );
  const allowed = mediaType(upload.type);
  if (!allowed) return;
  if (purpose && allowed.kind !== "image") return;
  const bytes = Buffer.from(await upload.arrayBuffer());
  if (!hasExpectedSignature(bytes, upload.type)) return;

  const usage = await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `media-quota:${context.organization.id}`,
    },
    (transaction) =>
      transaction.mediaAsset.aggregate({
        where: { organizationId: context.organization.id, status: { not: "deleted" } },
        _sum: { byteSize: true },
      }),
  );
  if (
    (usage._sum.byteSize ?? 0n) + BigInt(bytes.byteLength) >
    BigInt(dashboardConfig.FACTORY_MAX_ORGANIZATION_MEDIA_BYTES)
  )
    throw new Error("MEDIA_QUOTA_EXCEEDED");
  if (websiteId && !folderId) {
    folderId = await withTenantTransaction(
      dashboardDatabase(),
      tenantActionContext(context, `website-media-folder:${websiteId}`),
      async (transaction) => {
        const website = await transaction.website.findFirst({
          where: { id: websiteId, organizationId: context.organization.id, archivedAt: null },
          include: { domains: { orderBy: { createdAt: "asc" }, take: 1 } },
        });
        if (!website) throw new Error("WEBSITE_NOT_FOUND");
        const folderName = website.domains[0]?.hostnameNormalized ?? website.name;
        const existing = await transaction.mediaFolder.findFirst({
          where: {
            organizationId: context.organization.id,
            parentFolderId: null,
            archivedAt: null,
            name: folderName,
          },
          select: { id: true },
        });
        if (existing) return existing.id;
        const folder = await transaction.mediaFolder.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            name: folderName,
            orderKey: Date.now().toString(36).padStart(12, "0"),
          },
          select: { id: true },
        });
        return folder.id;
      },
    );
  }
  if (folderId) {
    const folderExists = await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: `validate-media-folder:${folderId}`,
      },
      (transaction) =>
        transaction.mediaFolder.count({
          where: { id: folderId, organizationId: context.organization.id, archivedAt: null },
        }),
    );
    if (folderExists !== 1) return;
  }
  const assetId = randomUUID();
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const relativeKey = mediaStorageKey({
    organizationId: context.organization.id,
    assetId,
    contentHash,
    extension: allowed.extension,
  });
  const absoluteKey = resolve(workspaceRoot, relativeKey);
  const storageKey = relativeKey.replaceAll("\\", "/");
  const remoteProvider =
    dashboardConfig.FACTORY_MEDIA_PROVIDER_URL && dashboardConfig.FACTORY_MEDIA_PROVIDER_SECRET
      ? new RemoteMediaProvider({
          endpoint: dashboardConfig.FACTORY_MEDIA_PROVIDER_URL,
          secret: dashboardConfig.FACTORY_MEDIA_PROVIDER_SECRET,
        })
      : null;
  let createdFile = false;
  if (remoteProvider) {
    await remoteProvider.upload({ storageKey, bytes, contentHash, contentType: upload.type });
    createdFile = true;
  } else {
    await mkdir(resolve(workspaceRoot, "media", context.organization.id), { recursive: true });
    try {
      await writeFile(absoluteKey, bytes, { flag: "wx" });
      createdFile = true;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    }
  }

  try {
    const processed = remoteProvider
      ? await remoteProvider.process({
          assetId,
          organizationId: context.organization.id,
          storageKey,
          contentHash,
          contentType: upload.type,
        })
      : localProcessedMedia(storageKey, contentHash, upload.type, bytes.byteLength);
    assertHealthyProcessedMedia(processed, context.organization.id);
    await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: `upload-media:${assetId}`,
      },
      async (transaction) => {
        await transaction.mediaAsset.create({
          data: {
            id: assetId,
            organizationId: context.organization.id,
            status: "ready",
            kind: allowed.kind,
            originalFilename: upload.name.slice(0, 255) || `upload.${allowed.extension}`,
            storageKey,
            contentHash,
            detectedContentType: upload.type,
            byteSize: BigInt(bytes.byteLength),
            metadataJson: jsonInput({
              ...processed.metadata,
              signatureChecked: true,
              processing: "ready",
            }),
            folderId: folderId || null,
          },
        });
        await transaction.mediaVariant.createMany({
          data: processed.variants.map((variant) => ({
            id: randomUUID(),
            organizationId: context.organization.id,
            mediaAssetId: assetId,
            variantKey: variant.key,
            storageKey: variant.storageKey,
            contentHash: variant.contentHash ?? null,
            contentType: variant.contentType,
            byteSize: BigInt(variant.byteSize),
            width: variant.width ?? null,
            height: variant.height ?? null,
          })),
        });
        if (websiteId && purpose) {
          await transaction.mediaReference.deleteMany({
            where: {
              organizationId: context.organization.id,
              websiteId,
              referenceKind: purpose === "favicon" ? "favicon" : "website_logo",
            },
          });
          await transaction.mediaReference.create({
            data: {
              id: randomUUID(),
              organizationId: context.organization.id,
              mediaAssetId: assetId,
              websiteId,
              referenceKind: purpose === "favicon" ? "favicon" : "website_logo",
              jsonPointer: purpose === "favicon" ? "/website/favicon" : "/settings/logoMediaId",
            },
          });
          if (purpose === "favicon") {
            await transaction.website.update({
              where: {
                organizationId_id: { organizationId: context.organization.id, id: websiteId },
              },
              data: {
                faviconAssetId: assetId,
                draftRevision: { increment: 1 },
                revision: { increment: 1 },
              },
            });
          } else {
            const settings = await transaction.websiteSettingsDraft.findFirst({
              where: { organizationId: context.organization.id, websiteId, locale: null },
              orderBy: { createdAt: "asc" },
            });
            if (!settings) throw new Error("WEBSITE_SETTINGS_NOT_FOUND");
            const current =
              settings.contentJson &&
              typeof settings.contentJson === "object" &&
              !Array.isArray(settings.contentJson)
                ? settings.contentJson
                : {};
            const content = { ...current, logoMediaId: assetId };
            await transaction.websiteSettingsDraft.update({
              where: { id: settings.id },
              data: {
                contentJson: jsonInput(content),
                contentSizeBytes: Buffer.byteLength(JSON.stringify(content)),
                revision: { increment: 1 },
              },
            });
            await transaction.website.update({
              where: {
                organizationId_id: { organizationId: context.organization.id, id: websiteId },
              },
              data: { draftRevision: { increment: 1 }, revision: { increment: 1 } },
            });
          }
        }
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            actorType: "user",
            actorId: context.actor.id,
            action: "media.uploaded",
            resourceType: "media_asset",
            resourceId: assetId,
            correlationId: `upload-media:${assetId}`,
            metadataJson: jsonInput({
              contentHash,
              contentType: upload.type,
              byteSize: bytes.byteLength,
            }),
            retentionClass: "standard",
          },
        });
      },
    );
  } catch (error) {
    if (createdFile) {
      if (remoteProvider) await remoteProvider.delete(storageKey).catch(() => undefined);
      else await unlink(absoluteKey).catch(() => undefined);
    }
    throw error;
  }
  revalidatePath("/media");
  if (websiteId) revalidatePath(`/websites/${websiteId}`);
  return assetId;
}

function localProcessedMedia(
  storageKey: string,
  contentHash: string,
  contentType: string,
  byteSize: number,
): ProcessedMedia {
  return {
    safe: true,
    detectedContentType: contentType,
    metadata: { scanner: "local-signature-validation", signatureChecked: true },
    variants: [
      {
        key: "original",
        storageKey,
        contentHash,
        contentType,
        byteSize,
      },
    ],
  };
}

function assertHealthyProcessedMedia(media: ProcessedMedia, organizationId: string): void {
  const prefix = `media/${organizationId}/`;
  if (!media.safe) throw new Error("MEDIA_REJECTED");
  if (!media.detectedContentType || media.variants.length < 1 || media.variants.length > 20) {
    throw new Error("MEDIA_PROCESSING_INVALID");
  }
  const keys = new Set<string>();
  for (const variant of media.variants) {
    if (
      !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(variant.key) ||
      keys.has(variant.key) ||
      !variant.storageKey.startsWith(prefix) ||
      variant.storageKey.slice(prefix.length).includes("/") ||
      !Number.isSafeInteger(variant.byteSize) ||
      variant.byteSize < 1 ||
      !variant.contentType
    ) {
      throw new Error("MEDIA_PROCESSING_INVALID");
    }
    keys.add(variant.key);
  }
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const assetId = cleanText(formData.get("assetId"), 80);
  if (!assetId) return;
  const context = await requireDashboardContext("media.create");
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `delete-media:${assetId}`,
    },
    async (transaction) => {
      const asset = await transaction.mediaAsset.findFirst({
        where: { id: assetId, organizationId: context.organization.id },
        include: { _count: { select: { references: true } } },
      });
      if (!asset || asset.status === "deleted") return;
      if (asset._count.references > 0) throw new Error("MEDIA_IN_USE");
      await transaction.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: "deleted",
          metadataJson: jsonInput({ deletionRequestedAt: new Date().toISOString() }),
          revision: { increment: 1 },
        },
      });
      await transaction.job.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          type: "media.gc",
          version: 1,
          payloadJson: jsonInput({ assetId }),
          status: "queued",
          priority: -5,
          maxAttempts: 8,
          availableAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
          deduplicationKey: `media.gc:${assetId}`,
          correlationId: `delete-media:${assetId}`,
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "media.deletion_requested",
          resourceType: "media_asset",
          resourceId: asset.id,
          correlationId: `delete-media:${assetId}`,
          metadataJson: jsonInput({ storageKey: asset.storageKey, gracePeriodHours: 24 }),
          retentionClass: "standard",
        },
      });
    },
  );
  revalidatePath("/media");
}

export async function updateSeoDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const pageId = cleanText(formData.get("pageId"), 80);
  const title = cleanText(formData.get("title"), 200);
  const description = cleanText(formData.get("description"), 500);
  const keywords = cleanText(formData.get("keywords"), 2_400)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 30);
  const index = formData.get("index") === "on";
  const follow = formData.get("follow") === "on";
  const expectedWebsiteRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (!websiteId || !pageId || !expectedWebsiteRevision) return;
  const parsed = seoDocumentSchema.safeParse({
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(keywords.length ? { keywords } : {}),
    robots: { index, follow },
  });
  if (!parsed.success) return;

  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `update-seo:${pageId}`,
    },
    async (transaction) => {
      const page = await transaction.pageDraft.findUnique({
        where: {
          organizationId_websiteId_id: {
            organizationId: context.organization.id,
            websiteId,
            id: pageId,
          },
        },
        select: { id: true, locale: true },
      });
      if (!page) return;
      const existing = await transaction.seoDraft.findFirst({
        where: {
          organizationId: context.organization.id,
          websiteId,
          pageId,
          locale: page.locale,
          deletedAt: null,
        },
      });
      const metadata = jsonInput(parsed.data);
      if (existing) {
        await transaction.seoDraft.update({
          where: { id: existing.id },
          data: {
            metadataJson: metadata,
            contentSizeBytes: Buffer.byteLength(JSON.stringify(parsed.data)),
            revision: { increment: 1 },
          },
        });
      } else {
        await transaction.seoDraft.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            websiteId,
            pageId,
            locale: page.locale,
            schemaVersion: 1,
            metadataJson: metadata,
            contentSizeBytes: Buffer.byteLength(JSON.stringify(parsed.data)),
          },
        });
      }
      const updatedWebsite = await transaction.website.updateMany({
        where: {
          organizationId: context.organization.id,
          id: websiteId,
          draftRevision: expectedWebsiteRevision,
        },
        data: { draftRevision: { increment: 1 } },
      });
      if (updatedWebsite.count !== 1) throw new Error("WEBSITE_DRAFT_REVISION_CONFLICT");
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "seo.updated",
          resourceType: "page",
          resourceId: pageId,
          correlationId: `update-seo:${pageId}`,
          metadataJson: jsonInput({ websiteId, locale: page.locale }),
          retentionClass: "standard",
        },
      });
    },
  );
  revalidatePath("/seo");
  revalidateWebsiteEditor(websiteId);
}

export async function updateOrganizationAction(formData: FormData): Promise<void> {
  const name = cleanText(formData.get("name"), 200);
  const defaultLocale = cleanText(formData.get("defaultLocale"), 35);
  const expectedRevision = parseRevision(formData.get("expectedRevision"));
  if (!name || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(defaultLocale) || !expectedRevision)
    return;
  const context = await requireDashboardContext("organization.manage");
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `update-organization:${context.organization.id}`,
    },
    async (transaction) => {
      const update = await transaction.organization.updateMany({
        where: { id: context.organization.id, revision: expectedRevision },
        data: { name, defaultLocale, revision: { increment: 1 } },
      });
      if (update.count !== 1) throw new Error("ORGANIZATION_REVISION_CONFLICT");
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "organization.updated",
          resourceType: "organization",
          resourceId: context.organization.id,
          correlationId: `update-organization:${context.organization.id}`,
          metadataJson: jsonInput({ name, defaultLocale }),
          retentionClass: "standard",
        },
      });
    },
  );
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function updateWebsiteSettingsDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const draftId = cleanText(formData.get("draftId"), 80);
  const expectedRevision = parseRevision(formData.get("expectedRevision"));
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  const content = parseJsonFormValue(formData.get("contentJson"));
  if (!websiteId || !draftId || !expectedRevision || !websiteDraftRevision || content === null)
    return;
  const context = await requireDashboardContext("website.edit");
  const website = await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `prepare-settings:${websiteId}`),
    (transaction) =>
      transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        select: { templateId: true, templateVersion: true },
      }),
  );
  if (!website) return;
  const template = await loadExactWebsiteTemplate(website.templateId, website.templateVersion);
  const validated = template?.websiteSchema.safeParse(content);
  if (!validated?.success) throw new Error("WEBSITE_SETTINGS_INVALID");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `update-settings:${draftId}`),
    async (transaction) => {
      const updated = await transaction.websiteSettingsDraft.updateMany({
        where: {
          id: draftId,
          organizationId: context.organization.id,
          websiteId,
          revision: expectedRevision,
        },
        data: {
          contentJson: jsonInput(validated.value),
          contentSizeBytes: Buffer.byteLength(JSON.stringify(validated.value)),
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error("DRAFT_REVISION_CONFLICT");
      await advanceWebsiteDraft(
        transaction,
        context.organization.id,
        websiteId,
        websiteDraftRevision,
      );
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "website.settings_updated",
        "website_settings",
        draftId,
        websiteId,
        {},
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function updateThemeDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const themeId = cleanText(formData.get("themeId"), 80);
  const expectedRevision = parseRevision(formData.get("expectedRevision"));
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  const tokens = parseJsonFormValue(formData.get("tokensJson"));
  if (!websiteId || !themeId || !expectedRevision || !websiteDraftRevision || tokens === null)
    return;
  const context = await requireDashboardContext("website.edit");
  const website = await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `prepare-theme:${websiteId}`),
    (transaction) =>
      transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        select: { templateId: true, templateVersion: true },
      }),
  );
  if (!website) return;
  const template = await loadExactWebsiteTemplate(website.templateId, website.templateVersion);
  const validated = template?.theme.schema.safeParse(tokens);
  if (!validated?.success) throw new Error("THEME_TOKENS_INVALID");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `update-theme:${themeId}`),
    async (transaction) => {
      const updated = await transaction.themeDraft.updateMany({
        where: {
          id: themeId,
          organizationId: context.organization.id,
          websiteId,
          revision: expectedRevision,
          deletedAt: null,
        },
        data: {
          tokensJson: jsonInput(validated.value),
          contentSizeBytes: Buffer.byteLength(JSON.stringify(validated.value)),
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error("DRAFT_REVISION_CONFLICT");
      await advanceWebsiteDraft(
        transaction,
        context.organization.id,
        websiteId,
        websiteDraftRevision,
      );
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "theme.updated",
        "theme",
        themeId,
        websiteId,
        {},
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function updateNavigationNodeAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const nodeId = cleanText(formData.get("nodeId"), 80);
  const expectedRevision = parseRevision(formData.get("expectedRevision"));
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (!websiteId || !nodeId || !expectedRevision || !websiteDraftRevision) return;
  // Navigation copy is safe for the assigned client to manage. The scoped helper
  // keeps the existing owner/admin behavior and verifies client ownership first.
  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `update-navigation-node:${nodeId}`),
    async (transaction) => {
      const node = await transaction.navigationNodeDraft.findFirst({
        where: {
          id: nodeId,
          organizationId: context.organization.id,
          websiteId,
          revision: expectedRevision,
          deletedAt: null,
        },
      });
      if (!node) throw new Error("DRAFT_REVISION_CONFLICT");
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        select: {
          defaultLocale: true,
          locales: {
            orderBy: [{ isDefault: "desc" }, { locale: "asc" }],
            select: { locale: true },
          },
        },
      });
      if (!website) return;
      const labels = jsonRecord(node.labelJson);
      const updatedLabels = Object.fromEntries(
        website.locales.map(({ locale }) => {
          if (!formData.has(`label:${locale}`))
            return [locale, localizedJsonLabel(node.labelJson, locale)];
          const label = cleanText(formData.get(`label:${locale}`), 160);
          return [locale, label || localizedJsonLabel(node.labelJson, website.defaultLocale)];
        }),
      );
      await transaction.navigationNodeDraft.update({
        where: { id: node.id },
        data: {
          labelJson: jsonInput({ ...labels, ...updatedLabels }),
          revision: { increment: 1 },
        },
      });
      await transaction.navigationDraft.update({
        where: { id: node.navigationId },
        data: { revision: { increment: 1 } },
      });
      await advanceWebsiteDraft(
        transaction,
        context.organization.id,
        websiteId,
        websiteDraftRevision,
      );
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "navigation.node_updated",
        "navigation_node",
        node.id,
        websiteId,
        { navigationId: node.navigationId },
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function upgradeWebsiteTemplateAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const targetVersion = cleanText(formData.get("targetVersion"), 64);
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (!websiteId || !targetVersion || !websiteDraftRevision) return;
  const context = await requireDashboardContext("website.edit");
  const client = dashboardDatabase();
  const website = await withTenantTransaction(
    client,
    tenantActionContext(context, `prepare-template-upgrade:${websiteId}`),
    (transaction) =>
      transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        include: {
          settingsDrafts: { where: { locale: null } },
          themeDrafts: { where: { locale: null, deletedAt: null } },
          pages: {
            where: { deletedAt: null },
            include: { sections: { where: { deletedAt: null } } },
          },
        },
      }),
  );
  if (!website || website.templateVersion === targetVersion) return;
  const candidates = await discoverTemplates(templatesRoot);
  const candidate = candidates.find(
    (item) =>
      item.discovery.templateId === website.templateId &&
      item.discovery.templateVersion === targetVersion,
  );
  if (!candidate) throw new Error("TEMPLATE_NOT_FOUND");
  const artifact = await loadTemplateArtifact(candidate);
  const catalog = await client.templateVersionRecord.findUnique({
    where: {
      templateId_templateVersion: {
        templateId: website.templateId,
        templateVersion: targetVersion,
      },
    },
    select: { artifactHash: true, lifecycleStatus: true, validationStatus: true },
  });
  if (
    !catalog ||
    catalog.lifecycleStatus !== "ready" ||
    catalog.validationStatus !== "valid" ||
    catalog.artifactHash !== artifact.artifactHash
  ) {
    throw new Error("TEMPLATE_NOT_READY");
  }
  const target = artifact.definition;
  for (const settings of website.settingsDrafts) {
    if (settings.schemaVersion !== target.websiteSchema.version) {
      throw new Error("TEMPLATE_SETTINGS_MIGRATION_REQUIRED");
    }
    if (!target.websiteSchema.safeParse(settings.contentJson).success) {
      throw new Error("TEMPLATE_SETTINGS_INCOMPATIBLE");
    }
  }
  for (const theme of website.themeDrafts) {
    if (
      theme.schemaVersion !== target.theme.schemaVersion ||
      !target.theme.schema.safeParse(theme.tokensJson).success
    ) {
      throw new Error("TEMPLATE_THEME_INCOMPATIBLE");
    }
  }
  for (const page of website.pages) {
    const pageDefinition = target.pages.find((definition) => definition.id === page.pageTypeId);
    if (!pageDefinition) throw new Error("TEMPLATE_PAGE_INCOMPATIBLE");
    for (const section of page.sections) {
      const sectionDefinition = target.sections.find(
        (definition) => definition.id === section.sectionTypeId,
      );
      if (
        !sectionDefinition ||
        !pageDefinition.allowedSections.includes(sectionDefinition.id) ||
        section.schemaVersion !== sectionDefinition.schema.version ||
        !sectionDefinition.schema.safeParse(section.contentJson).success
      ) {
        throw new Error("TEMPLATE_SECTION_INCOMPATIBLE");
      }
    }
  }
  await withTenantTransaction(
    client,
    tenantActionContext(context, `upgrade-template:${websiteId}`),
    async (transaction) => {
      const updated = await transaction.website.updateMany({
        where: {
          id: websiteId,
          organizationId: context.organization.id,
          templateVersion: website.templateVersion,
          draftRevision: websiteDraftRevision,
        },
        data: {
          templateVersion: targetVersion,
          draftRevision: { increment: 1 },
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error("WEBSITE_DRAFT_REVISION_CONFLICT");
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "website.template_upgraded",
        "website",
        websiteId,
        websiteId,
        { fromVersion: website.templateVersion, toVersion: targetVersion },
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function addWebsiteLocaleAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const locale = canonicalLocale(cleanText(formData.get("locale"), 35));
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (!websiteId || !locale || !isSupportedWebsiteLocale(locale) || !websiteDraftRevision) return;
  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  const client = dashboardDatabase();
  const website = await withTenantTransaction(
    client,
    tenantActionContext(context, `prepare-locale:${websiteId}:${locale}`),
    (transaction) =>
      transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        include: {
          locales: true,
          pages: {
            where: { deletedAt: null },
            include: {
              sections: { where: { deletedAt: null }, orderBy: { orderKey: "asc" } },
              seoDrafts: { where: { deletedAt: null } },
            },
            orderBy: { orderKey: "asc" },
          },
          navigationDrafts: {
            where: { deletedAt: null },
            include: { nodes: { where: { deletedAt: null }, orderBy: { orderKey: "asc" } } },
          },
        },
      }),
  );
  if (!website || website.locales.some((item) => item.locale === locale)) return;
  const template = await loadExactWebsiteTemplate(website.templateId, website.templateVersion);
  if (!template) throw new Error("TEMPLATE_NOT_FOUND");
  if (!supportedTemplateLocales(template).includes(locale)) {
    throw new Error("TEMPLATE_LOCALE_UNSUPPORTED");
  }
  const sourcePages = website.pages.filter((page) => page.locale === website.defaultLocale);
  if (sourcePages.length === 0) throw new Error("DEFAULT_LOCALE_PAGES_MISSING");
  const pageIds = new Map(sourcePages.map((page) => [page.id, randomUUID()]));
  await withTenantTransaction(
    client,
    tenantActionContext(context, `add-locale:${websiteId}:${locale}`),
    async (transaction) => {
      await transaction.websiteLocale.create({
        data: {
          organizationId: context.organization.id,
          websiteId,
          locale,
          isDefault: false,
          fallbackLocale: website.defaultLocale,
        },
      });
      for (const page of sourcePages) {
        const pageId = pageIds.get(page.id)!;
        await transaction.pageDraft.create({
          data: {
            id: pageId,
            organizationId: context.organization.id,
            websiteId,
            pageTypeId: page.pageTypeId,
            locale,
            title: localizedTemplateTitle(page.title, locale),
            slug: page.slug,
            status: page.status,
            schemaVersion: page.schemaVersion,
            settingsJson: jsonInput(page.settingsJson),
            orderKey: page.orderKey,
          },
        });
        if (page.sections.length > 0) {
          await transaction.sectionDraft.createMany({
            data: page.sections.map((section) => {
              const localizedContent = localizeTemplateDefault(
                section.contentJson as JsonValue,
                locale,
              );
              return {
                id: randomUUID(),
                organizationId: context.organization.id,
                websiteId,
                pageId,
                sectionTypeId: section.sectionTypeId,
                schemaVersion: section.schemaVersion,
                contentJson: jsonInput(localizedContent),
                contentSizeBytes: Buffer.byteLength(JSON.stringify(localizedContent)),
                visibilityJson: jsonInput(section.visibilityJson),
                orderKey: section.orderKey,
              };
            }),
          });
        }
        const sourceSeo = page.seoDrafts.find(
          (seo) => seo.locale === website.defaultLocale || seo.locale === null,
        );
        if (sourceSeo) {
          await transaction.seoDraft.create({
            data: {
              id: randomUUID(),
              organizationId: context.organization.id,
              websiteId,
              pageId,
              locale,
              schemaVersion: sourceSeo.schemaVersion,
              metadataJson: jsonInput(sourceSeo.metadataJson),
              contentSizeBytes: sourceSeo.contentSizeBytes,
            },
          });
        }
      }
      for (const navigation of website.navigationDrafts) {
        const definition = template.navigation.find((item) => item.id === navigation.definitionId);
        if (!definition) continue;
        if (
          definition.localization === "localized-tree" &&
          navigation.locale === website.defaultLocale
        ) {
          const navigationId = randomUUID();
          const nodeIds = new Map(navigation.nodes.map((node) => [node.id, randomUUID()]));
          await transaction.navigationDraft.create({
            data: {
              id: navigationId,
              organizationId: context.organization.id,
              websiteId,
              definitionId: navigation.definitionId,
              locale,
              visibilitySchemaVersion: navigation.visibilitySchemaVersion,
            },
          });
          for (const node of navigation.nodes) {
            const target = jsonRecord(node.targetJson);
            await transaction.navigationNodeDraft.create({
              data: {
                id: nodeIds.get(node.id)!,
                organizationId: context.organization.id,
                websiteId,
                navigationId,
                parentNodeId: null,
                nodeKind: node.nodeKind,
                pageId: node.pageId ? (pageIds.get(node.pageId) ?? null) : null,
                labelJson: jsonInput({
                  [locale]: localizedJsonLabel(node.labelJson, website.defaultLocale),
                }),
                targetJson: jsonInput({
                  ...target,
                  ...(node.pageId && pageIds.has(node.pageId)
                    ? { pageId: pageIds.get(node.pageId)! }
                    : {}),
                }),
                visibilityJson: jsonInput(node.visibilityJson),
                orderKey: node.orderKey,
              },
            });
          }
          for (const node of navigation.nodes) {
            if (!node.parentNodeId) continue;
            const parentNodeId = nodeIds.get(node.parentNodeId);
            if (!parentNodeId) throw new Error("NAVIGATION_PARENT_MISSING");
            await transaction.navigationNodeDraft.update({
              where: { id: nodeIds.get(node.id)! },
              data: { parentNodeId },
            });
          }
        } else if (definition.localization === "localized-labels" && navigation.locale === null) {
          for (const node of navigation.nodes) {
            const labels = jsonRecord(node.labelJson);
            await transaction.navigationNodeDraft.update({
              where: { id: node.id },
              data: {
                labelJson: jsonInput({
                  ...labels,
                  [locale]: localizedJsonLabel(node.labelJson, website.defaultLocale),
                }),
                revision: { increment: 1 },
              },
            });
          }
          await transaction.navigationDraft.update({
            where: { id: navigation.id },
            data: { revision: { increment: 1 } },
          });
        }
      }
      await advanceWebsiteDraft(
        transaction,
        context.organization.id,
        websiteId,
        websiteDraftRevision,
      );
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "website.locale_added",
        "website",
        websiteId,
        websiteId,
        { locale, fallbackLocale: website.defaultLocale },
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function updateWebsiteDefaultLocaleAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const defaultLocale = canonicalLocale(cleanText(formData.get("defaultLocale"), 35));
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (
    !websiteId ||
    !defaultLocale ||
    !isSupportedWebsiteLocale(defaultLocale) ||
    !websiteDraftRevision
  )
    return;

  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  await withTenantTransaction(
    dashboardDatabase(),
    tenantActionContext(context, `set-default-locale:${websiteId}:${defaultLocale}`),
    async (transaction) => {
      const website = await transaction.website.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: websiteId } },
        include: { locales: true },
      });
      if (!website || !website.locales.some((locale) => locale.locale === defaultLocale)) {
        throw new Error("WEBSITE_LOCALE_NOT_FOUND");
      }
      if (website.defaultLocale === defaultLocale) return;

      for (const locale of website.locales) {
        await transaction.websiteLocale.update({
          where: { websiteId_locale: { websiteId, locale: locale.locale } },
          data: {
            isDefault: locale.locale === defaultLocale,
            fallbackLocale: locale.locale === defaultLocale ? null : defaultLocale,
          },
        });
      }
      const updated = await transaction.website.updateMany({
        where: {
          organizationId: context.organization.id,
          id: websiteId,
          draftRevision: websiteDraftRevision,
        },
        data: {
          defaultLocale,
          draftRevision: { increment: 1 },
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error("WEBSITE_DRAFT_REVISION_CONFLICT");
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "website.default_locale_updated",
        "website",
        websiteId,
        websiteId,
        { fromLocale: website.defaultLocale, toLocale: defaultLocale },
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function updatePageDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const pageId = cleanText(formData.get("pageId"), 80);
  const title = cleanText(formData.get("title"), 200);
  const slug = normalizePageSlug(cleanText(formData.get("slug"), 240));
  const expectedRevision = parseRevision(formData.get("expectedRevision"));
  if (!websiteId || !pageId || !title || !slug || !expectedRevision) return;

  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.edit");
  const organization = context.organization;
  const actorId = context.actor.id;

  await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId, correlationId: `update-page:${pageId}` },
    async (transaction) => {
      const pageUpdate = await transaction.pageDraft.updateMany({
        where: {
          organizationId: organization.id,
          websiteId,
          id: pageId,
          revision: expectedRevision,
          deletedAt: null,
        },
        data: { title, slug, revision: { increment: 1 } },
      });
      if (pageUpdate.count !== 1) throw new Error("DRAFT_REVISION_CONFLICT");

      // The page revision is the concurrency boundary for page metadata. The website draft
      // revision is an aggregate counter changed by every editor card, so using it as a
      // compare-and-swap guard would make unrelated section saves conflict with this page.
      const websiteUpdate = await transaction.website.updateMany({
        where: {
          organizationId: organization.id,
          id: websiteId,
        },
        data: { draftRevision: { increment: 1 } },
      });
      if (websiteUpdate.count !== 1) throw new Error("WEBSITE_NOT_FOUND");
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: organization.id,
          actorType: "system",
          actorId,
          action: "page.updated",
          resourceType: "page",
          resourceId: pageId,
          correlationId: `update-page:${pageId}`,
          metadataJson: jsonInput({ websiteId, title, slug }),
          retentionClass: "standard",
        },
      });
    },
  );

  revalidatePath("/");
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
}

export async function addSectionDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const pageId = cleanText(formData.get("pageId"), 80);
  const sectionTypeId = cleanText(formData.get("sectionTypeId"), 180);
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (!websiteId || !pageId || !sectionTypeId || !websiteDraftRevision) return;

  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.edit");
  const page = await withTenantTransaction(
    client,
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `prepare-add-section:${pageId}`,
    },
    (transaction) =>
      transaction.pageDraft.findUnique({
        where: {
          organizationId_websiteId_id: {
            organizationId: context.organization.id,
            websiteId,
            id: pageId,
          },
        },
        include: {
          sections: { where: { deletedAt: null }, orderBy: { orderKey: "asc" } },
          website: { select: { templateId: true, templateVersion: true } },
        },
      }),
  );
  if (!page || page.deletedAt) return;
  const template = await loadExactWebsiteTemplate(
    page.website.templateId,
    page.website.templateVersion,
  );
  const pageDefinition = template?.pages.find((item) => item.id === page.pageTypeId);
  const sectionDefinition = template?.sections.find((item) => item.id === sectionTypeId);
  if (
    !pageDefinition ||
    !sectionDefinition ||
    !pageDefinition.allowedSections.includes(sectionDefinition.id)
  )
    return;
  const maximum = pageDefinition.requiredSections.find(
    (item) => item.sectionTypeId === sectionDefinition.id,
  )?.maximum;
  if (
    maximum !== undefined &&
    page.sections.filter((item) => item.sectionTypeId === sectionTypeId).length >= maximum
  )
    return;

  const sectionId = randomUUID();
  const orderKey = nextOrderKey(page.sections.map((item) => item.orderKey));
  await withTenantTransaction(
    client,
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `add-section:${sectionId}`,
    },
    async (transaction) => {
      await transaction.sectionDraft.create({
        data: {
          id: sectionId,
          organizationId: context.organization.id,
          websiteId,
          pageId,
          sectionTypeId,
          schemaVersion: sectionDefinition.schema.version,
          contentJson: jsonInput(sectionDefinition.defaults),
          orderKey,
        },
      });
      await transaction.pageDraft.update({
        where: {
          organizationId_websiteId_id: {
            organizationId: context.organization.id,
            websiteId,
            id: pageId,
          },
        },
        data: { revision: { increment: 1 } },
      });
      await advanceWebsiteDraft(
        transaction,
        context.organization.id,
        websiteId,
        websiteDraftRevision,
      );
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "section.created",
        "section",
        sectionId,
        websiteId,
        { pageId, sectionTypeId },
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function duplicateSectionDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const sectionId = cleanText(formData.get("sectionId"), 80);
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (!websiteId || !sectionId || !websiteDraftRevision) return;
  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.edit");
  const section = await withTenantTransaction(
    client,
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `prepare-duplicate-section:${sectionId}`,
    },
    (transaction) =>
      transaction.sectionDraft.findFirst({
        where: {
          id: sectionId,
          organizationId: context.organization.id,
          websiteId,
          deletedAt: null,
        },
        include: {
          page: {
            include: {
              sections: { where: { deletedAt: null }, orderBy: { orderKey: "asc" } },
              website: { select: { templateId: true, templateVersion: true } },
            },
          },
        },
      }),
  );
  if (!section) return;
  const template = await loadExactWebsiteTemplate(
    section.page.website.templateId,
    section.page.website.templateVersion,
  );
  const pageDefinition = template?.pages.find((item) => item.id === section.page.pageTypeId);
  const sectionDefinition = template?.sections.find((item) => item.id === section.sectionTypeId);
  if (!pageDefinition || !sectionDefinition) return;
  const maximum = pageDefinition.requiredSections.find(
    (item) => item.sectionTypeId === section.sectionTypeId,
  )?.maximum;
  if (
    maximum !== undefined &&
    section.page.sections.filter((item) => item.sectionTypeId === section.sectionTypeId).length >=
      maximum
  )
    return;

  const duplicateId = randomUUID();
  await withTenantTransaction(
    client,
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `duplicate-section:${duplicateId}`,
    },
    async (transaction) => {
      await transaction.sectionDraft.create({
        data: {
          id: duplicateId,
          organizationId: context.organization.id,
          websiteId,
          pageId: section.pageId,
          sectionTypeId: section.sectionTypeId,
          schemaVersion: section.schemaVersion,
          contentJson: jsonInput(section.contentJson),
          orderKey: nextOrderKey(section.page.sections.map((item) => item.orderKey)),
        },
      });
      await transaction.pageDraft.update({
        where: { id: section.pageId },
        data: { revision: { increment: 1 } },
      });
      await advanceWebsiteDraft(
        transaction,
        context.organization.id,
        websiteId,
        websiteDraftRevision,
      );
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "section.duplicated",
        "section",
        duplicateId,
        websiteId,
        { sourceSectionId: sectionId, pageId: section.pageId },
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function deleteSectionDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const sectionId = cleanText(formData.get("sectionId"), 80);
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (!websiteId || !sectionId || !websiteDraftRevision) return;
  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.edit");
  const section = await withTenantTransaction(
    client,
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `prepare-delete-section:${sectionId}`,
    },
    (transaction) =>
      transaction.sectionDraft.findFirst({
        where: {
          id: sectionId,
          organizationId: context.organization.id,
          websiteId,
          deletedAt: null,
        },
        include: {
          page: {
            include: {
              sections: { where: { deletedAt: null } },
              website: { select: { templateId: true, templateVersion: true } },
            },
          },
        },
      }),
  );
  if (!section) return;
  const template = await loadExactWebsiteTemplate(
    section.page.website.templateId,
    section.page.website.templateVersion,
  );
  const pageDefinition = template?.pages.find((item) => item.id === section.page.pageTypeId);
  const minimum =
    pageDefinition?.requiredSections.find((item) => item.sectionTypeId === section.sectionTypeId)
      ?.minimum ?? 0;
  if (
    section.page.sections.filter((item) => item.sectionTypeId === section.sectionTypeId).length <=
    minimum
  )
    return;
  await withTenantTransaction(
    client,
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `delete-section:${sectionId}`,
    },
    async (transaction) => {
      const updated = await transaction.sectionDraft.updateMany({
        where: {
          id: sectionId,
          organizationId: context.organization.id,
          websiteId,
          deletedAt: null,
        },
        data: { deletedAt: new Date(), revision: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error("DRAFT_REVISION_CONFLICT");
      await transaction.pageDraft.update({
        where: { id: section.pageId },
        data: { revision: { increment: 1 } },
      });
      await advanceWebsiteDraft(
        transaction,
        context.organization.id,
        websiteId,
        websiteDraftRevision,
      );
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "section.deleted",
        "section",
        sectionId,
        websiteId,
        { pageId: section.pageId },
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function moveSectionDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const sectionId = cleanText(formData.get("sectionId"), 80);
  const direction = cleanText(formData.get("direction"), 8);
  const targetSectionId = cleanText(formData.get("targetSectionId"), 80);
  const websiteDraftRevision = parseRevision(formData.get("websiteDraftRevision"));
  if (
    !websiteId ||
    !sectionId ||
    (!targetSectionId && !["up", "down"].includes(direction)) ||
    !websiteDraftRevision
  )
    return;
  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.edit");
  await withTenantTransaction(
    client,
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `move-section:${sectionId}`,
    },
    async (transaction) => {
      const section = await transaction.sectionDraft.findFirst({
        where: {
          id: sectionId,
          organizationId: context.organization.id,
          websiteId,
          deletedAt: null,
        },
      });
      if (!section) return;
      const siblings = await transaction.sectionDraft.findMany({
        where: {
          organizationId: context.organization.id,
          websiteId,
          pageId: section.pageId,
          deletedAt: null,
        },
        orderBy: [{ orderKey: "asc" }, { id: "asc" }],
      });
      const index = siblings.findIndex((item) => item.id === sectionId);
      const neighbor = targetSectionId
        ? siblings.find((item) => item.id === targetSectionId && item.pageId === section.pageId)
        : siblings[direction === "up" ? index - 1 : index + 1];
      if (!neighbor) return;
      await transaction.sectionDraft.update({
        where: { id: section.id },
        data: { orderKey: neighbor.orderKey, revision: { increment: 1 } },
      });
      await transaction.sectionDraft.update({
        where: { id: neighbor.id },
        data: { orderKey: section.orderKey, revision: { increment: 1 } },
      });
      await transaction.pageDraft.update({
        where: { id: section.pageId },
        data: { revision: { increment: 1 } },
      });
      await advanceWebsiteDraft(
        transaction,
        context.organization.id,
        websiteId,
        websiteDraftRevision,
      );
      await writeDraftAudit(
        transaction,
        context.organization.id,
        context.actor.id,
        "section.reordered",
        "section",
        sectionId,
        websiteId,
        { direction: targetSectionId ? "drag" : direction, pageId: section.pageId },
      );
    },
  );
  revalidateWebsiteEditor(websiteId);
}

export async function updateSectionDraftAction(formData: FormData): Promise<void> {
  const websiteId = cleanText(formData.get("websiteId"), 80);
  const sectionId = cleanText(formData.get("sectionId"), 80);
  const expectedRevision = parseRevision(formData.get("expectedRevision"));
  if (!websiteId || !sectionId || !expectedRevision) return;

  const client = dashboardDatabase();
  const context = await requireWebsiteMutationContext(websiteId, "website.edit");
  const organization = context.organization;
  const actorId = context.actor.id;

  const sectionContext = await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId, correlationId: `load-section:${sectionId}` },
    (transaction) =>
      transaction.sectionDraft.findFirst({
        where: { organizationId: organization.id, websiteId, id: sectionId, deletedAt: null },
        include: {
          page: {
            select: {
              website: { select: { templateId: true, templateVersion: true } },
            },
          },
        },
      }),
  );
  if (!sectionContext) return;
  if (sectionContext.revision !== expectedRevision) throw new Error("DRAFT_REVISION_CONFLICT");

  const candidate = (await discoverTemplates(templatesRoot)).find(
    (item) =>
      item.discovery.templateId === sectionContext.page.website.templateId &&
      item.discovery.templateVersion === sectionContext.page.website.templateVersion,
  );
  if (!candidate) return;
  const template = await loadTemplate(candidate);
  const definition = template.sections.find(
    (section) => section.id === sectionContext.sectionTypeId,
  );
  if (!definition) return;

  const content = mergeSectionContent(sectionContext.contentJson, formData);
  const validated = definition.schema.safeParse(content);
  if (!validated.success) {
    throw new Error(
      `SECTION_CONTENT_INVALID:${validated.issues.map((issue) => issue.path).join(",")}`,
    );
  }

  await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId, correlationId: `update-section:${sectionId}` },
    async (transaction) => {
      const sectionUpdate = await transaction.sectionDraft.updateMany({
        where: {
          id: sectionId,
          organizationId: organization.id,
          websiteId,
          revision: expectedRevision,
          deletedAt: null,
        },
        data: {
          contentJson: jsonInput(validated.value),
          revision: { increment: 1 },
        },
      });
      if (sectionUpdate.count !== 1) throw new Error("DRAFT_REVISION_CONFLICT");

      const referencedMedia = collectMediaReferences(validated.value);
      const referencedMediaIds = [...new Set(referencedMedia.map((item) => item.id))];
      if (referencedMediaIds.length > 0) {
        const readyAssets = await transaction.mediaAsset.findMany({
          where: {
            organizationId: organization.id,
            id: { in: referencedMediaIds },
            status: "ready",
          },
          select: { id: true, kind: true },
        });
        const readyById = new Map(readyAssets.map((asset) => [asset.id, asset.kind]));
        if (
          readyAssets.length !== referencedMediaIds.length ||
          referencedMedia.some((reference) => readyById.get(reference.id) !== reference.kind)
        ) {
          throw new Error("SECTION_MEDIA_NOT_READY");
        }
      }
      await transaction.mediaReference.deleteMany({
        where: {
          organizationId: organization.id,
          sectionId,
          referenceKind: "section_content",
        },
      });
      for (const mediaAssetId of new Set(referencedMediaIds)) {
        await transaction.mediaReference.create({
          data: {
            id: randomUUID(),
            organizationId: organization.id,
            mediaAssetId,
            websiteId,
            pageId: sectionContext.pageId,
            sectionId,
            referenceKind: "section_content",
          },
        });
      }

      // The section revision above protects this section from concurrent edits. The website
      // draft revision is only an aggregate publication counter and may legitimately change
      // while another section is being edited.
      const websiteUpdate = await transaction.website.updateMany({
        where: {
          organizationId: organization.id,
          id: websiteId,
        },
        data: { draftRevision: { increment: 1 } },
      });
      if (websiteUpdate.count !== 1) throw new Error("WEBSITE_NOT_FOUND");
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: organization.id,
          actorType: "system",
          actorId,
          action: "section.updated",
          resourceType: "section",
          resourceId: sectionId,
          correlationId: `update-section:${sectionId}`,
          metadataJson: jsonInput({ websiteId, sectionTypeId: sectionContext.sectionTypeId }),
          retentionClass: "standard",
        },
      });
    },
  );

  revalidatePath("/");
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
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
  if (!hostname) throw new Error("WEBSITE_MEDIA_HOSTNAME_REQUIRED");
  const filename = storageFilename(storageKey);
  const dashboardUrl = new URL(dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL);
  const localPort = hostname.endsWith(".localhost") ? dashboardUrl.port : "";
  const scheme = hostname.endsWith(".localhost") ? dashboardUrl.protocol : "https:";
  return `${scheme}//${hostname}${localPort ? `:${localPort}` : ""}/media/${encodeURIComponent(filename)}`;
}

function storageFilename(storageKey: string): string {
  const normalized = storageKey.replaceAll("\\", "/");
  const filename = normalized.split("/").at(-1);
  if (!filename || filename.includes("..")) throw new Error("MEDIA_STORAGE_KEY_INVALID");
  return filename;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseJsonFormValue(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || Buffer.byteLength(value) > 1_000_000) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function canonicalLocale(value: string): string | null {
  try {
    return Intl.getCanonicalLocales(value)[0] ?? null;
  } catch {
    return null;
  }
}

function localizedJsonLabel(value: unknown, locale: string): string {
  const labels = jsonRecord(value);
  const preferred = labels[locale];
  if (typeof preferred === "string") return preferred;
  return (
    Object.values(labels).find((item): item is string => typeof item === "string") ?? "Untitled"
  );
}

function tenantActionContext(
  context: Awaited<ReturnType<typeof requireDashboardContext>>,
  correlationId: string,
) {
  return {
    organizationId: context.organization.id,
    actorId: context.actor.id,
    correlationId,
  };
}

async function loadExactWebsiteTemplate(
  templateId: string,
  templateVersion: string,
): Promise<TemplateDefinition | null> {
  const candidate = (await discoverTemplates(templatesRoot)).find(
    (item) =>
      item.discovery.templateId === templateId &&
      item.discovery.templateVersion === templateVersion,
  );
  return candidate ? loadTemplate(candidate) : null;
}

function nextOrderKey(keys: readonly string[]): string {
  const maximum = keys.reduce((current, key) => {
    const parsed = Number.parseInt(key, 10);
    return Number.isSafeInteger(parsed) ? Math.max(current, parsed) : current;
  }, -1);
  return String(maximum + 1).padStart(8, "0");
}

async function advanceWebsiteDraft(
  transaction: DatabaseTransaction,
  organizationId: string,
  websiteId: string,
  expectedRevision: bigint,
): Promise<void> {
  const updated = await transaction.website.updateMany({
    where: { organizationId, id: websiteId, draftRevision: expectedRevision },
    data: { draftRevision: { increment: 1 } },
  });
  if (updated.count !== 1) throw new Error("WEBSITE_DRAFT_REVISION_CONFLICT");
}

async function writeDraftAudit(
  transaction: DatabaseTransaction,
  organizationId: string,
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  websiteId: string,
  metadata: Record<string, JsonValue>,
): Promise<void> {
  await transaction.auditEvent.create({
    data: {
      id: randomUUID(),
      organizationId,
      actorType: "user",
      actorId,
      action,
      resourceType,
      resourceId,
      correlationId: `${action}:${resourceId}`,
      metadataJson: jsonInput({ websiteId, ...metadata }),
      retentionClass: "standard",
    },
  });
}

function revalidateWebsiteEditor(websiteId: string): void {
  revalidatePath("/");
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
  revalidatePath(`/account/websites/${websiteId}`);
}

function cleanText(value: FormDataEntryValue | null, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function subdomainUnavailableUrl(hostname: string): string {
  return `/websites?createError=subdomain-taken&hostname=${encodeURIComponent(hostname)}#create-website`;
}

function templateUnavailableUrl(): string {
  return "/websites?createError=template-not-ready#create-website";
}

function parseSubscriptionExpiry(value: string): Date | null {
  if (!value) return null;
  const isoValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T23:59:59.999Z`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)
      ? `${value.length === 16 ? `${value}:00` : value}Z`
      : value;
  const parsed = new Date(isoValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseRevision(value: FormDataEntryValue | null): bigint | null {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function normalizeHostname(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return normalized || `site-${Date.now()}`;
}

function slugFromTitle(value: string): string {
  const slug = normalizeHostname(value);
  return slug === "home" ? "/" : slug;
}

function normalizePageSlug(value: string): string {
  if (value === "/") return "/";
  return normalizeHostname(value.replace(/^\/+/, "")) || "/";
}

function mediaType(contentType: string): { kind: string; extension: string } | null {
  return (
    (
      {
        "image/jpeg": { kind: "image", extension: "jpg" },
        "image/png": { kind: "image", extension: "png" },
        "image/webp": { kind: "image", extension: "webp" },
        "image/gif": { kind: "image", extension: "gif" },
        "application/pdf": { kind: "document", extension: "pdf" },
      } as Record<string, { kind: string; extension: string }>
    )[contentType] ?? null
  );
}

function hasExpectedSignature(bytes: Buffer, contentType: string): boolean {
  const startsWith = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
  if (contentType === "image/png")
    return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (contentType === "image/webp")
    return (
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  if (contentType === "image/gif") {
    const signature = bytes.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (contentType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

function mergeSectionContent(current: unknown, formData: FormData): unknown {
  const rawJson = cleanText(formData.get("contentJson"), 20_000);
  if (rawJson) {
    try {
      return JSON.parse(rawJson) as unknown;
    } catch {
      return current;
    }
  }

  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field:")) {
      const fieldName = key.slice("field:".length);
      base[fieldName] = fieldName.endsWith("MediaId") && value === "" ? null : value;
      continue;
    }
    if (key.startsWith("jsonField:") && typeof value === "string") {
      try {
        base[key.slice("jsonField:".length)] = JSON.parse(value) as unknown;
      } catch {
        throw new Error("SECTION_FIELD_JSON_INVALID");
      }
    }
  }
  return base;
}

function collectMediaReferences(
  value: unknown,
): { readonly id: string; readonly kind: "document" | "image" }[] {
  if (Array.isArray(value)) return value.flatMap(collectMediaReferences);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(key.endsWith("MediaId") && typeof child === "string" && child
      ? [
          {
            id: child,
            kind: key.toLowerCase().includes("pdf") ? ("document" as const) : ("image" as const),
          },
        ]
      : []),
    ...collectMediaReferences(child),
  ]);
}

function jsonInput(value: unknown): Exclude<JsonValue, null> {
  return (value ?? {}) as Exclude<JsonValue, null>;
}

async function verifyRollbackArtifact(
  storageUri: string,
  expectedHash: string,
  organizationId: string,
  websiteId: string,
  publicationId: string,
  templateId: string,
  templateVersion: string,
): Promise<ReturnType<typeof parseSnapshot>> {
  const snapshot = parseSnapshot(JSON.parse(await readFile(storageUri, "utf8")));
  if (
    snapshot.organizationId !== organizationId ||
    snapshot.websiteId !== websiteId ||
    snapshot.publicationId !== publicationId ||
    snapshot.template.id !== templateId ||
    snapshot.template.version !== templateVersion ||
    snapshotHash(snapshot) !== expectedHash
  ) {
    throw new Error("ROLLBACK_ARTIFACT_INTEGRITY_FAILED");
  }
  return snapshot;
}
