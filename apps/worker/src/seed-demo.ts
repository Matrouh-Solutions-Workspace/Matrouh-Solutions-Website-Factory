import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";
import { createDatabaseClient, withTenantTransaction } from "@factory/database";
import { compilePublication } from "@factory/publication-compiler";
import type { JsonValue } from "@factory/template-sdk";
import { discoverTemplates, loadTemplateArtifact } from "@factory/template-loader";
import { validateTemplate } from "@factory/template-validator";
import { workerArtifactStore as artifactStore } from "./artifact-store";
import { workerConfig, workspaceRoot } from "./config";

const templatesRoot = resolve(workspaceRoot, workerConfig.FACTORY_TEMPLATE_DIRECTORY);
if (workerConfig.FACTORY_DEPLOYMENT_MODE === "production") {
  throw new Error("DEMO_SEED_DISABLED_IN_PRODUCTION");
}
const organizationId = stableUuid("organization:matrouh-solutions-demo");
const actorId = stableUuid("user:demo-owner");
const membershipId = stableUuid("membership:demo-owner");
const roleId = stableUuid("role:demo-admin");
const demoSessionToken =
  workerConfig.FACTORY_DEMO_SESSION_TOKEN ?? "local-demo-session-token-change-before-sharing-2026";
await artifactStore.ready();

const database = createDatabaseClient({
  connectionString: workerConfig.DATABASE_URL,
});
let seeded = 0;

try {
  await database.organization.upsert({
    where: { id: organizationId },
    update: {
      name: "Matrouh Solutions Demo",
      slug: "matrouh-solutions-demo",
      defaultLocale: "en",
      planKey: "demo",
      status: "active",
    },
    create: {
      id: organizationId,
      name: "Matrouh Solutions Demo",
      slug: "matrouh-solutions-demo",
      defaultLocale: "en",
      planKey: "demo",
      status: "active",
    },
  });

  await database.user.upsert({
    where: { normalizedEmail: "owner@matrouh.local" },
    update: {
      displayName: "Demo Owner",
      primaryEmail: "owner@matrouh.local",
      status: "active",
    },
    create: {
      id: actorId,
      displayName: "Demo Owner",
      primaryEmail: "owner@matrouh.local",
      normalizedEmail: "owner@matrouh.local",
      status: "active",
    },
  });

  await withTenantTransaction(
    database,
    { organizationId, actorId, correlationId: "seed-demo" },
    async (transaction) => {
      await transaction.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId,
            userId: actorId,
          },
        },
        update: { status: "active" },
        create: {
          id: membershipId,
          organizationId,
          userId: actorId,
          status: "active",
        },
      });
      await transaction.role.upsert({
        where: { organizationId_key: { organizationId, key: "admin" } },
        update: { name: "Administrator", isSystem: true },
        create: { id: roleId, organizationId, key: "admin", name: "Administrator", isSystem: true },
      });
      await transaction.membershipRole.upsert({
        where: { membershipId_roleId: { membershipId, roleId } },
        update: {},
        create: { organizationId, membershipId, roleId },
      });
    },
  );
  await database.session.upsert({
    where: { tokenHash: createHash("sha256").update(demoSessionToken).digest("hex") },
    update: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), revokedAt: null },
    create: {
      id: stableUuid("session:demo-owner"),
      userId: actorId,
      tokenHash: createHash("sha256").update(demoSessionToken).digest("hex"),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const candidates = (await discoverTemplates(templatesRoot)).sort(
    (left, right) =>
      left.discovery.templateId.localeCompare(right.discovery.templateId) ||
      left.discovery.templateVersion.localeCompare(right.discovery.templateVersion, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
  );
  for (const candidate of candidates) {
    const artifact = await loadTemplateArtifact(candidate);
    const template = artifact.definition;
    const report = validateTemplate(artifact, {
      factoryVersion: "0.1.0",
      rendererVersion: "0.1.0",
      supportedSdkVersions: ["1.0.0"],
      contentSchemaVersions: [1],
      themeSchemaVersions: [1],
      publicationSnapshotVersions: [1],
    });
    if (!report.valid || !report.manifest)
      throw new Error(`Invalid template ${candidate.discovery.templateId}`);

    const templateId = candidate.discovery.templateId;
    const templateVersion = candidate.discovery.templateVersion;
    const templateLabel = templateId.split(".").at(-1) ?? templateId;
    const websiteId = stableUuid(`website:${templateId}`);
    const publicationId = stableUuid(
      `publication:${templateId}:${templateVersion}:${artifact.artifactHash}:demo-v3`,
    );
    const hostname = `${templateLabel}.localhost`;
    const artifactHash = artifact.artifactHash;
    if (template.pages.length === 0) continue;
    const pages = template.pages.map((page, pageIndex) => ({
      id: stableUuid(`page:${templateId}:${page.id}:en`),
      pageTypeId: page.id,
      locale: "en",
      title: page.title,
      slug: page.slug.defaultValue ?? (pageIndex === 0 ? "/" : page.title.toLowerCase()),
      seo: {
        title: `${page.title} | ${template.manifest.displayName}`,
        description: template.manifest.description,
      },
      sections: page.defaultSections.map((item, sectionIndex) => {
        const definition = template.sections.find((section) => section.id === item.sectionTypeId);
        if (!definition) throw new Error("Default section missing");
        return {
          id: stableUuid(
            pageIndex === 0
              ? `section:${templateId}:${definition.id}:${sectionIndex}`
              : `section:${templateId}:${page.id}:${definition.id}:${sectionIndex}`,
          ),
          sectionTypeId: definition.id,
          schemaVersion: definition.schema.version,
          content: item.content ?? definition.defaults,
          orderKey: String(sectionIndex).padStart(4, "0"),
        };
      }),
    }));
    const navigation = template.navigation.map((definition) => ({
      definitionId: definition.id,
      locale: definition.localization === "localized-tree" ? "en" : null,
      schemaVersion: definition.visibilitySchema.version,
      nodes: pages.flatMap((page) =>
        definition.allowedPageTypes === "all" ||
        definition.allowedPageTypes.includes(page.pageTypeId)
          ? [
              {
                id: stableUuid(
                  `navigation-node:${templateId}:${definition.id}:${page.pageTypeId}:en`,
                ),
                kind: "page" as const,
                pageId: page.id,
                label: { en: page.title },
                visibility: definition.visibilitySchema.parse({}),
                children: [],
              },
            ]
          : [],
      ),
    }));
    const result = compilePublication(
      {
        organizationId,
        websiteId,
        publicationId,
        revision: 1n,
        name: template.manifest.displayName,
        defaultLocale: "en",
        settingsSchemaVersion: template.websiteSchema.version,
        settings: template.websiteSchema.parse({}),
        locales: [{ locale: "en", fallbackLocale: null }],
        pages,
        navigation,
        theme: template.theme.defaults,
        media: [],
      },
      template,
      artifactHash,
      artifact.manifest.manifestHash,
    );
    if (!result.success) throw new Error(JSON.stringify(result.diagnostics));

    const storedArtifact = await artifactStore.putImmutable(publicationId, result.snapshot);

    await database.templateCatalogEntry.upsert({
      where: { templateId },
      update: {
        displayName: template.manifest.displayName,
        author: template.manifest.author,
        description: template.manifest.description,
        category: template.manifest.category,
        lifecycleStatus: "ready",
      },
      create: {
        id: stableUuid(`template-catalog:${templateId}`),
        templateId,
        displayName: template.manifest.displayName,
        author: template.manifest.author,
        description: template.manifest.description,
        category: template.manifest.category,
        lifecycleStatus: "ready",
      },
    });

    await database.templateVersionRecord.upsert({
      where: {
        templateId_templateVersion: {
          templateId,
          templateVersion,
        },
      },
      update: {
        artifactUri: relative(templatesRoot, candidate.root).replaceAll("\\", "/"),
        artifactHash,
        sdkVersion: template.compatibility.sdkVersion,
        minimumFactoryVersion: template.compatibility.minimumFactoryVersion,
        maximumFactoryVersion: template.compatibility.maximumFactoryVersion ?? null,
        minimumRendererVersion: template.compatibility.minimumRendererVersion,
        contentSchemaVersion: template.compatibility.contentSchemaVersion,
        themeSchemaVersion: template.compatibility.themeSchemaVersion,
        publicationSnapshotVersion: template.compatibility.publicationSnapshotVersion,
        manifestJson: jsonInput(report.manifest),
        validationReportJson: jsonInput(report),
        validationStatus: "valid",
        lifecycleStatus: "ready",
        validatedAt: new Date(),
      },
      create: {
        id: stableUuid(`template-version:${templateId}:${templateVersion}`),
        templateCatalogEntryId: stableUuid(`template-catalog:${templateId}`),
        templateId,
        templateVersion,
        artifactUri: relative(templatesRoot, candidate.root).replaceAll("\\", "/"),
        artifactHash,
        sdkVersion: template.compatibility.sdkVersion,
        minimumFactoryVersion: template.compatibility.minimumFactoryVersion,
        maximumFactoryVersion: template.compatibility.maximumFactoryVersion ?? null,
        minimumRendererVersion: template.compatibility.minimumRendererVersion,
        contentSchemaVersion: template.compatibility.contentSchemaVersion,
        themeSchemaVersion: template.compatibility.themeSchemaVersion,
        publicationSnapshotVersion: template.compatibility.publicationSnapshotVersion,
        manifestJson: jsonInput(report.manifest),
        validationReportJson: jsonInput(report),
        validationStatus: "valid",
        lifecycleStatus: "ready",
        validatedAt: new Date(),
      },
    });

    await withTenantTransaction(
      database,
      { organizationId, actorId, correlationId: `seed-demo:${templateId}` },
      async (transaction) => {
        await transaction.website.upsert({
          where: {
            organizationId_id: {
              organizationId,
              id: websiteId,
            },
          },
          update: {
            name: template.manifest.displayName,
            status: "published",
            templateId,
            templateVersion,
            defaultLocale: "en",
          },
          create: {
            id: websiteId,
            organizationId,
            name: template.manifest.displayName,
            status: "published",
            templateId,
            templateVersion,
            defaultLocale: "en",
          },
        });

        await transaction.websiteLocale.upsert({
          where: { websiteId_locale: { websiteId, locale: "en" } },
          update: { isDefault: true, fallbackLocale: null },
          create: {
            organizationId,
            websiteId,
            locale: "en",
            isDefault: true,
            fallbackLocale: null,
          },
        });

        for (const [pageIndex, snapshotPage] of result.snapshot.pages.entries()) {
          await transaction.pageDraft.upsert({
            where: {
              organizationId_websiteId_id: {
                organizationId,
                websiteId,
                id: snapshotPage.id,
              },
            },
            update: {
              pageTypeId: snapshotPage.pageTypeId,
              locale: snapshotPage.locale,
              title: snapshotPage.title,
              slug: snapshotPage.slug,
              orderKey: String(pageIndex).padStart(4, "0"),
            },
            create: {
              id: snapshotPage.id,
              organizationId,
              websiteId,
              pageTypeId: snapshotPage.pageTypeId,
              locale: snapshotPage.locale,
              title: snapshotPage.title,
              slug: snapshotPage.slug,
              orderKey: String(pageIndex).padStart(4, "0"),
            },
          });

          for (const section of snapshotPage.sections) {
            await transaction.sectionDraft.upsert({
              where: { id: section.id },
              update: {
                sectionTypeId: section.sectionTypeId,
                schemaVersion: section.schemaVersion,
                contentJson: jsonInput(section.content),
                orderKey: section.orderKey,
              },
              create: {
                id: section.id,
                organizationId,
                websiteId,
                pageId: snapshotPage.id,
                sectionTypeId: section.sectionTypeId,
                schemaVersion: section.schemaVersion,
                contentJson: jsonInput(section.content),
                orderKey: section.orderKey,
              },
            });
          }
        }

        for (const snapshotNavigation of result.snapshot.navigation) {
          const existingNavigation = await transaction.navigationDraft.findFirst({
            where: {
              organizationId,
              websiteId,
              definitionId: snapshotNavigation.definitionId,
              locale: snapshotNavigation.locale,
            },
            select: { id: true },
          });
          const navigationId =
            existingNavigation?.id ??
            stableUuid(
              `navigation:${templateId}:${snapshotNavigation.definitionId}:${snapshotNavigation.locale ?? "shared"}`,
            );
          await transaction.navigationDraft.upsert({
            where: { id: navigationId },
            update: {
              visibilitySchemaVersion: snapshotNavigation.schemaVersion,
              deletedAt: null,
            },
            create: {
              id: navigationId,
              organizationId,
              websiteId,
              definitionId: snapshotNavigation.definitionId,
              locale: snapshotNavigation.locale,
              visibilitySchemaVersion: snapshotNavigation.schemaVersion,
            },
          });
          for (const [nodeIndex, rawNode] of snapshotNavigation.nodes.entries()) {
            if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) continue;
            const node = rawNode as Record<string, JsonValue>;
            if (typeof node.id !== "string" || typeof node.kind !== "string") continue;
            await transaction.navigationNodeDraft.upsert({
              where: { id: node.id },
              update: {
                nodeKind: node.kind,
                pageId: typeof node.pageId === "string" ? node.pageId : null,
                labelJson: jsonInput(node.label),
                targetJson: jsonInput(
                  node.kind === "external" && typeof node.href === "string"
                    ? { href: node.href }
                    : typeof node.pageId === "string"
                      ? { pageId: node.pageId }
                      : {},
                ),
                visibilityJson: jsonInput(node.visibility),
                orderKey: String(nodeIndex).padStart(4, "0"),
                deletedAt: null,
              },
              create: {
                id: node.id,
                organizationId,
                websiteId,
                navigationId,
                parentNodeId: null,
                nodeKind: node.kind,
                pageId: typeof node.pageId === "string" ? node.pageId : null,
                labelJson: jsonInput(node.label),
                targetJson: jsonInput(
                  node.kind === "external" && typeof node.href === "string"
                    ? { href: node.href }
                    : typeof node.pageId === "string"
                      ? { pageId: node.pageId }
                      : {},
                ),
                visibilityJson: jsonInput(node.visibility),
                orderKey: String(nodeIndex).padStart(4, "0"),
              },
            });
          }
        }

        const existingPublication = await transaction.publication.findUnique({
          where: { id: publicationId },
          select: { sequenceNumber: true },
        });
        const publicationSequence =
          existingPublication?.sequenceNumber ??
          ((
            await transaction.publication.aggregate({
              where: { websiteId },
              _max: { sequenceNumber: true },
            })
          )._max.sequenceNumber ?? 0n) + 1n;
        await transaction.publication.upsert({
          where: {
            organizationId_websiteId_id: {
              organizationId,
              websiteId,
              id: publicationId,
            },
          },
          update: {
            sequenceNumber: publicationSequence,
            sourceDraftRevision: 1n,
            templateId,
            templateVersion,
            templateArtifactHash: artifactHash,
            snapshotSchemaVersion: result.snapshot.snapshotVersion,
            status: "ready",
            failureCode: null,
            readyAt: new Date(),
          },
          create: {
            id: publicationId,
            organizationId,
            websiteId,
            sequenceNumber: publicationSequence,
            sourceDraftRevision: 1n,
            templateId,
            templateVersion,
            templateArtifactHash: artifactHash,
            snapshotSchemaVersion: result.snapshot.snapshotVersion,
            status: "ready",
            readyAt: new Date(),
          },
        });

        await transaction.publicationArtifact.upsert({
          where: {
            publicationId_artifactKind: {
              publicationId,
              artifactKind: "snapshot",
            },
          },
          update: {
            storageUri: storedArtifact.uri,
            contentHash: storedArtifact.hash,
            byteSize: BigInt(storedArtifact.byteSize),
          },
          create: {
            id: stableUuid(`publication-artifact:${publicationId}:snapshot`),
            organizationId,
            publicationId,
            artifactKind: "snapshot",
            storageUri: storedArtifact.uri,
            contentHash: storedArtifact.hash,
            byteSize: BigInt(storedArtifact.byteSize),
          },
        });

        const existingDomain = await transaction.domain.findFirst({
          where: { hostnameNormalized: hostname, releasedAt: null },
          select: { id: true },
        });
        if (existingDomain) {
          await transaction.domain.update({
            where: { id: existingDomain.id },
            data: {
              organizationId,
              websiteId,
              hostnameDisplay: hostname,
              kind: "subdomain",
              status: "active",
              releasedAt: null,
            },
          });
        } else {
          await transaction.domain.create({
            data: {
              id: stableUuid(`domain:${hostname}`),
              organizationId,
              websiteId,
              hostnameNormalized: hostname,
              hostnameDisplay: hostname,
              kind: "subdomain",
              status: "active",
            },
          });
        }

        await transaction.website.update({
          where: {
            organizationId_id: {
              organizationId,
              id: websiteId,
            },
          },
          data: {
            activePublicationId: publicationId,
            status: "published",
          },
        });
      },
    );
    seeded += 1;
  }

  console.log(
    `Seeded ${seeded} demo websites, publications, domains, and artifacts for organization ${organizationId}`,
  );
  console.log(`Dashboard credential: ${organizationId}.${demoSessionToken}`);
} finally {
  await database.$disconnect();
}

function stableUuid(input: string): string {
  const chars = createHash("sha256").update(input).digest("hex").slice(0, 32).split("");
  chars[12] = "4";
  const variant = Number.parseInt(chars[16] ?? "8", 16);
  chars[16] = ((variant & 0x3) | 0x8).toString(16);
  return `${chars.slice(0, 8).join("")}-${chars.slice(8, 12).join("")}-${chars
    .slice(12, 16)
    .join("")}-${chars.slice(16, 20).join("")}-${chars.slice(20).join("")}`;
}

function jsonInput(value: unknown): Exclude<JsonValue, null> {
  return (value ?? {}) as Exclude<JsonValue, null>;
}
