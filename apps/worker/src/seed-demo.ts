import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";
import { createDatabaseClient, withTenantTransaction } from "@factory/database";
import { hashPassword } from "@factory/auth";
import { localizeTemplateDefault, localizedTemplateTitle } from "@factory/content";
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
const demoClientUserId = stableUuid("user:demo-client");
const demoClientMembershipId = stableUuid("membership:demo-client");
const demoClientRoleId = stableUuid("role:demo-client");
const demoClientId = stableUuid("client:north-coast-health-group");
const demoPassword = "MatrouhDemo2026!";
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
      passwordHash: hashPassword(demoPassword),
      status: "active",
    },
    create: {
      id: actorId,
      displayName: "Demo Owner",
      primaryEmail: "owner@matrouh.local",
      normalizedEmail: "owner@matrouh.local",
      passwordHash: hashPassword(demoPassword),
      status: "active",
    },
  });

  await database.user.upsert({
    where: { normalizedEmail: "client@matrouh.local" },
    update: {
      displayName: "Demo Client",
      primaryEmail: "client@matrouh.local",
      passwordHash: hashPassword(demoPassword),
      status: "active",
    },
    create: {
      id: demoClientUserId,
      displayName: "Demo Client",
      primaryEmail: "client@matrouh.local",
      normalizedEmail: "client@matrouh.local",
      passwordHash: hashPassword(demoPassword),
      status: "active",
    },
  });

  await database.session.deleteMany({
    where: {
      id: { in: [stableUuid("session:demo-owner"), stableUuid("session:demo-client")] },
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
      await transaction.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId,
            userId: demoClientUserId,
          },
        },
        update: { status: "active" },
        create: {
          id: demoClientMembershipId,
          organizationId,
          userId: demoClientUserId,
          status: "active",
        },
      });
      await transaction.role.upsert({
        where: { organizationId_key: { organizationId, key: "client" } },
        update: { name: "Client", isSystem: true },
        create: {
          id: demoClientRoleId,
          organizationId,
          key: "client",
          name: "Client",
          isSystem: true,
        },
      });
      await transaction.membershipRole.upsert({
        where: {
          membershipId_roleId: {
            membershipId: demoClientMembershipId,
            roleId: demoClientRoleId,
          },
        },
        update: {},
        create: {
          organizationId,
          membershipId: demoClientMembershipId,
          roleId: demoClientRoleId,
        },
      });
      await transaction.client.upsert({
        where: { organizationId_id: { organizationId, id: demoClientId } },
        update: {
          name: "North Coast Health Group",
          contactName: "Demo Client",
          contactEmail: "client@matrouh.local",
          contactPhone: "+20 100 000 0000",
          archivedAt: null,
        },
        create: {
          id: demoClientId,
          organizationId,
          name: "North Coast Health Group",
          contactName: "Demo Client",
          contactEmail: "client@matrouh.local",
          contactPhone: "+20 100 000 0000",
          notes: "Demo account for exercising client billing and communication flows.",
        },
      });
    },
  );

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
      `publication:${templateId}:${templateVersion}:${artifact.artifactHash}:demo-v6-language-defaults`,
    );
    const hostname = `${templateLabel}.localhost`;
    const artifactHash = artifact.artifactHash;
    const subscriptionCadence = templateId.includes("engineer")
      ? "trial"
      : templateId.includes("clinic")
        ? "yearly"
        : "monthly";
    const subscriptionDurationDays =
      subscriptionCadence === "trial" ? 1 : subscriptionCadence === "yearly" ? 365 : 30;
    const subscriptionStartsAt = new Date();
    const subscriptionExpiresAt = new Date(
      subscriptionStartsAt.getTime() + subscriptionDurationDays * 24 * 60 * 60 * 1_000,
    );
    if (template.pages.length === 0) continue;
    const demoDefaultLocale = templateId.includes("clinic") ? "ar" : "en";
    const demoLocales = [demoDefaultLocale, demoDefaultLocale === "en" ? "ar" : "en"] as const;
    const pages = demoLocales.flatMap((locale) =>
      template.pages.map((page, pageIndex) => ({
        id: stableUuid(`page:${templateId}:${page.id}:${locale}`),
        pageTypeId: page.id,
        locale,
        title: localizedTemplateTitle(page.title, locale),
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
              locale === "en"
                ? pageIndex === 0
                  ? `section:${templateId}:${definition.id}:${sectionIndex}`
                  : `section:${templateId}:${page.id}:${definition.id}:${sectionIndex}`
                : `section:${templateId}:${page.id}:${definition.id}:${sectionIndex}:${locale}`,
            ),
            sectionTypeId: definition.id,
            schemaVersion: definition.schema.version,
            content: localizeTemplateDefault(item.content ?? definition.defaults, locale),
            orderKey: String(sectionIndex).padStart(4, "0"),
          };
        }),
      })),
    );
    const navigation = template.navigation.flatMap((definition) => {
      const navigationLocales = definition.localization === "localized-tree" ? demoLocales : [null];
      return navigationLocales.map((navigationLocale) => {
        const pageLocale = navigationLocale ?? demoDefaultLocale;
        return {
          definitionId: definition.id,
          locale: navigationLocale,
          schemaVersion: definition.visibilitySchema.version,
          nodes: pages.flatMap((page) =>
            page.locale === pageLocale &&
            (definition.allowedPageTypes === "all" ||
              definition.allowedPageTypes.includes(page.pageTypeId))
              ? [
                  {
                    id: stableUuid(
                      `navigation-node:${templateId}:${definition.id}:${page.pageTypeId}:${navigationLocale ?? "shared"}`,
                    ),
                    kind: "page" as const,
                    pageId: page.id,
                    label: { en: page.title, ar: localizedTemplateTitle(page.title, "ar") },
                    visibility: definition.visibilitySchema.parse({}),
                    children: [],
                  },
                ]
              : [],
          ),
        };
      });
    });
    const result = compilePublication(
      {
        organizationId,
        websiteId,
        publicationId,
        revision: 1n,
        name: template.manifest.displayName,
        defaultLocale: demoDefaultLocale,
        settingsSchemaVersion: template.websiteSchema.version,
        settings: template.websiteSchema.parse({}),
        locales: demoLocales.map((locale) => ({
          locale,
          fallbackLocale: locale === demoDefaultLocale ? null : demoDefaultLocale,
        })),
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
            clientId: demoClientId,
            templateId,
            templateVersion,
            defaultLocale: demoDefaultLocale,
          },
          create: {
            id: websiteId,
            organizationId,
            clientId: demoClientId,
            name: template.manifest.displayName,
            status: "published",
            templateId,
            templateVersion,
            defaultLocale: demoDefaultLocale,
          },
        });

        await transaction.websiteSubscription.upsert({
          where: { websiteId },
          update: {
            clientId: demoClientId,
            cadence: subscriptionCadence,
            status: "active",
            startsAt: subscriptionStartsAt,
            expiresAt: subscriptionExpiresAt,
            disabledAt: null,
            disabledReason: null,
            resumeStatus: null,
          },
          create: {
            id: stableUuid(`subscription:${templateId}`),
            organizationId,
            websiteId,
            clientId: demoClientId,
            cadence: subscriptionCadence,
            status: "active",
            startsAt: subscriptionStartsAt,
            expiresAt: subscriptionExpiresAt,
          },
        });

        await transaction.websiteLocale.upsert({
          where: { websiteId_locale: { websiteId, locale: "en" } },
          update: {
            isDefault: demoDefaultLocale === "en",
            fallbackLocale: demoDefaultLocale === "en" ? null : demoDefaultLocale,
          },
          create: {
            organizationId,
            websiteId,
            locale: "en",
            isDefault: demoDefaultLocale === "en",
            fallbackLocale: demoDefaultLocale === "en" ? null : demoDefaultLocale,
          },
        });
        await transaction.websiteLocale.upsert({
          where: { websiteId_locale: { websiteId, locale: "ar" } },
          update: {
            isDefault: demoDefaultLocale === "ar",
            fallbackLocale: demoDefaultLocale === "ar" ? null : demoDefaultLocale,
          },
          create: {
            organizationId,
            websiteId,
            locale: "ar",
            isDefault: demoDefaultLocale === "ar",
            fallbackLocale: demoDefaultLocale === "ar" ? null : demoDefaultLocale,
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
  console.log(`Staff account: owner@matrouh.local / ${demoPassword}`);
  console.log(`Client account: client@matrouh.local / ${demoPassword}`);
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
