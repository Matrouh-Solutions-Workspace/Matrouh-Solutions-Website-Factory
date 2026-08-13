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
const demoCommercePhone = "+20 128 428 9997";
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

  const candidates =
    process.env.FACTORY_SEED_COMMERCE_ONLY === "true"
      ? []
      : (await discoverTemplates(templatesRoot)).sort(
          (left, right) =>
            left.discovery.templateId.localeCompare(right.discovery.templateId) ||
            left.discovery.templateVersion.localeCompare(
              right.discovery.templateVersion,
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              },
            ),
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
            const existingSection = await transaction.sectionDraft.findFirst({
              where: {
                organizationId,
                websiteId,
                pageId: snapshotPage.id,
                orderKey: section.orderKey,
                deletedAt: null,
              },
              select: { id: true },
            });
            await transaction.sectionDraft.upsert({
              where: { id: existingSection?.id ?? section.id },
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

  const commerceTemplate = await database.ecommerceTemplateVersion.findFirst({
    where: { status: "ready", template: { slug: "fashion-store", status: "ready" } },
    include: { template: true },
  });
  if (!commerceTemplate) throw new Error("ECOMMERCE_DEMO_TEMPLATE_MISSING");
  const commerceWebsiteId = stableUuid("website:matrouh-market-demo");
  const commerceStoreId = stableUuid("ecommerce-store:matrouh-market-demo");
  await withTenantTransaction(
    database,
    { organizationId, actorId, correlationId: "seed-demo:ecommerce" },
    async (transaction) => {
      await transaction.website.upsert({
        where: { organizationId_id: { organizationId, id: commerceWebsiteId } },
        update: {
          clientId: demoClientId,
          name: "Maison Matrouh",
          kind: "ecommerce",
          status: "published",
          templateId: `ecommerce:${commerceTemplate.template.slug}`,
          templateVersion: commerceTemplate.version,
          defaultLocale: "en",
        },
        create: {
          id: commerceWebsiteId,
          organizationId,
          clientId: demoClientId,
          name: "Maison Matrouh",
          kind: "ecommerce",
          status: "published",
          templateId: `ecommerce:${commerceTemplate.template.slug}`,
          templateVersion: commerceTemplate.version,
          defaultLocale: "en",
        },
      });
      for (const locale of ["en", "ar"] as const) {
        await transaction.websiteLocale.upsert({
          where: { websiteId_locale: { websiteId: commerceWebsiteId, locale } },
          update: { isDefault: locale === "en", fallbackLocale: locale === "en" ? null : "en" },
          create: {
            organizationId,
            websiteId: commerceWebsiteId,
            locale,
            isDefault: locale === "en",
            fallbackLocale: locale === "en" ? null : "en",
          },
        });
      }
      await transaction.domain.upsert({
        where: { id: stableUuid("domain:shop.localhost") },
        update: {
          organizationId,
          websiteId: commerceWebsiteId,
          hostnameNormalized: "shop.localhost",
          hostnameDisplay: "shop.localhost",
          status: "active",
          releasedAt: null,
        },
        create: {
          id: stableUuid("domain:shop.localhost"),
          organizationId,
          websiteId: commerceWebsiteId,
          hostnameNormalized: "shop.localhost",
          hostnameDisplay: "shop.localhost",
          kind: "subdomain",
          status: "active",
        },
      });
      await transaction.ecommerceStore.upsert({
        where: { organizationId_id: { organizationId, id: commerceStoreId } },
        update: {
          websiteId: commerceWebsiteId,
          ownerUserId: demoClientUserId,
          ecommerceTemplateVersionId: commerceTemplate.id,
          name: "Maison Matrouh",
          slug: "matrouh-market",
          status: "active",
          defaultLocale: "en",
          currency: "EGP",
          contactEmail: "client@matrouh.local",
          contactPhone: demoCommercePhone,
          brandingJson: jsonInput({ primary: "#171512", accent: "#a45f3f" }),
          settingsJson: jsonInput({ allowAppearanceToggle: true }),
        },
        create: {
          id: commerceStoreId,
          organizationId,
          websiteId: commerceWebsiteId,
          ownerUserId: demoClientUserId,
          ecommerceTemplateVersionId: commerceTemplate.id,
          name: "Maison Matrouh",
          slug: "matrouh-market",
          status: "active",
          defaultLocale: "en",
          currency: "EGP",
          contactEmail: "client@matrouh.local",
          contactPhone: demoCommercePhone,
          brandingJson: jsonInput({ primary: "#171512", accent: "#a45f3f" }),
          settingsJson: jsonInput({ allowAppearanceToggle: true }),
        },
      });
      for (const locale of ["en", "ar"] as const) {
        await transaction.ecommerceStoreLocale.upsert({
          where: { storeId_locale: { storeId: commerceStoreId, locale } },
          update: {
            organizationId,
            isDefault: locale === "en",
            storeName: locale === "ar" ? "ميزون مطروح" : "Maison Matrouh",
            description:
              locale === "ar"
                ? "قطع عصرية مختارة بعناية لحياة الساحل والمدينة."
                : "Considered modern pieces for coastal days and city nights.",
            footerText:
              locale === "ar"
                ? "أناقة هادئة، وجودة تدوم، وخدمة محلية."
                : "Quiet style, lasting quality, and local service.",
          },
          create: {
            organizationId,
            storeId: commerceStoreId,
            locale,
            isDefault: locale === "en",
            storeName: locale === "ar" ? "ميزون مطروح" : "Maison Matrouh",
            description:
              locale === "ar"
                ? "قطع عصرية مختارة بعناية لحياة الساحل والمدينة."
                : "Considered modern pieces for coastal days and city nights.",
            footerText:
              locale === "ar"
                ? "أناقة هادئة، وجودة تدوم، وخدمة محلية."
                : "Quiet style, lasting quality, and local service.",
          },
        });
      }
      const demoCategories = [
        {
          key: "women",
          en: "Women",
          ar: "نساء",
          enDescription: "Refined everyday layers",
          arDescription: "طبقات يومية راقية",
        },
        {
          key: "men",
          en: "Men",
          ar: "رجال",
          enDescription: "Relaxed modern tailoring",
          arDescription: "تفصيل عصري مريح",
        },
        {
          key: "accessories",
          en: "Accessories",
          ar: "إكسسوارات",
          enDescription: "Finishing details",
          arDescription: "تفاصيل تكمل الإطلالة",
        },
        {
          key: "summer-edit",
          en: "Summer edit",
          ar: "تشكيلة الصيف",
          enDescription: "Made for warm days",
          arDescription: "مصممة للأيام الدافئة",
        },
        {
          key: "occasion",
          en: "Occasion",
          ar: "المناسبات",
          enDescription: "Modern evening pieces",
          arDescription: "قطع عصرية للمساء",
        },
        {
          key: "essentials",
          en: "Essentials",
          ar: "الأساسيات",
          enDescription: "The foundation of a wardrobe",
          arDescription: "أساس خزانة الملابس",
        },
      ] as const;
      const categoryIds = new Map<string, string>();
      for (const [position, item] of demoCategories.entries()) {
        const categoryId = stableUuid(`ecommerce-category:matrouh-market:fashion:${item.key}`);
        categoryIds.set(item.key, categoryId);
        await transaction.ecommerceCategory.upsert({
          where: { storeId_slug: { storeId: commerceStoreId, slug: item.key } },
          update: { visible: true, position },
          create: {
            id: categoryId,
            organizationId,
            storeId: commerceStoreId,
            slug: item.key,
            position,
          },
        });
        for (const locale of ["en", "ar"] as const) {
          const name = locale === "ar" ? item.ar : item.en;
          const description = locale === "ar" ? item.arDescription : item.enDescription;
          await transaction.ecommerceCategoryTranslation.upsert({
            where: { categoryId_locale: { categoryId, locale } },
            update: { name, description },
            create: { categoryId, locale, name, description },
          });
        }
      }
      await transaction.ecommerceCategory.updateMany({
        where: { organizationId, storeId: commerceStoreId, slug: "coastal-essentials" },
        data: { visible: false },
      });
      const demoProducts = [
        {
          key: "sand-linen-shirt",
          en: "Sand linen shirt",
          ar: "قميص كتان رملي",
          shortEn: "Airy European linen with a relaxed, structured cut.",
          shortAr: "كتان أوروبي خفيف بقصة مريحة ومنظمة.",
          descriptionEn:
            "A breathable long-sleeve shirt cut from washed linen, finished with shell-effect buttons and a softly structured collar.",
          descriptionAr: "قميص طويل الأكمام من الكتان المغسول بأزرار لؤلؤية وياقة ناعمة ومنظمة.",
          price: 189900,
          sale: null,
          sku: "MM-LIN-01",
          stock: 18,
          category: "men",
          attributes: {
            brand: "Maison Matrouh",
            material: "100% linen",
            color: "Sand",
            fit: "Relaxed",
            badge: "Bestseller",
            featured: true,
          },
        },
        {
          key: "dune-wrap-dress",
          en: "Dune wrap dress",
          ar: "فستان ديون ملفوف",
          shortEn: "A fluid midi silhouette for effortless day-to-evening dressing.",
          shortAr: "قصة ميدي انسيابية تناسب النهار والمساء بسهولة.",
          descriptionEn:
            "A fluid wrap dress with an adjustable waist, softly gathered shoulder, and breathable matte finish.",
          descriptionAr: "فستان ملفوف انسيابي بخصر قابل للتعديل وكتف مجمع بلطف ولمسة نهائية مريحة.",
          price: 279900,
          sale: 239900,
          sku: "MM-DRS-02",
          stock: 9,
          category: "women",
          attributes: {
            brand: "Noura Studio",
            material: "Tencel blend",
            color: "Terracotta",
            fit: "Regular",
            badge: "Limited",
            featured: true,
          },
        },
        {
          key: "coast-knit-polo",
          en: "Coast knit polo",
          ar: "بولو كوست محبوك",
          shortEn: "Textured cotton knit with a clean open collar.",
          shortAr: "نسيج قطني بارز بياقة مفتوحة نظيفة.",
          descriptionEn:
            "A mid-weight cotton knit polo designed with a straight hem and refined open neckline.",
          descriptionAr: "قميص بولو قطني متوسط الوزن بحافة مستقيمة وياقة مفتوحة راقية.",
          price: 169900,
          sale: null,
          sku: "MM-POL-03",
          stock: 14,
          category: "men",
          attributes: {
            brand: "Harbor",
            material: "Cotton knit",
            color: "Ecru",
            fit: "Regular",
            featured: true,
          },
        },
        {
          key: "woven-market-tote",
          en: "Woven market tote",
          ar: "حقيبة سوق منسوجة",
          shortEn: "A generous hand-finished tote for city and coast.",
          shortAr: "حقيبة واسعة مصنوعة يدوياً للمدينة والساحل.",
          descriptionEn:
            "A structured natural-fiber tote with reinforced handles and a removable cotton pouch.",
          descriptionAr: "حقيبة منظمة من ألياف طبيعية بمقابض معززة وجراب قطني قابل للإزالة.",
          price: 119900,
          sale: 99900,
          sku: "MM-BAG-04",
          stock: 22,
          category: "accessories",
          attributes: {
            brand: "Siwa Made",
            material: "Palm fiber",
            color: "Natural",
            badge: "Artisan",
          },
        },
        {
          key: "sea-glass-overshirt",
          en: "Sea glass overshirt",
          ar: "قميص سي جلاس خارجي",
          shortEn: "A soft utility layer in garment-dyed cotton twill.",
          shortAr: "طبقة عملية ناعمة من القطن المصبوغ بعد الخياطة.",
          descriptionEn:
            "A versatile cotton-twill overshirt with patch pockets, tonal buttons, and an easy unisex shape.",
          descriptionAr: "قميص خارجي متعدد الاستخدامات بجيوب خارجية وأزرار متناغمة وقصة للجميع.",
          price: 219900,
          sale: null,
          sku: "MM-OVR-05",
          stock: 7,
          category: "summer-edit",
          attributes: {
            brand: "Maison Matrouh",
            material: "Cotton twill",
            color: "Sea glass",
            fit: "Oversized",
          },
        },
        {
          key: "midnight-column-dress",
          en: "Midnight column dress",
          ar: "فستان ميدنايت مستقيم",
          shortEn: "Minimal evening tailoring with a sculpted neckline.",
          shortAr: "تفصيل مسائي بسيط بياقة منحوتة.",
          descriptionEn:
            "A clean column silhouette with subtle stretch, a sculpted neckline, and a back vent for movement.",
          descriptionAr: "قصة مستقيمة نظيفة بمرونة خفيفة وياقة منحوتة وفتحة خلفية للحركة.",
          price: 349900,
          sale: null,
          sku: "MM-EVE-06",
          stock: 5,
          category: "occasion",
          attributes: {
            brand: "Noura Studio",
            material: "Crepe",
            color: "Midnight",
            fit: "Column",
            badge: "New",
          },
        },
        {
          key: "everyday-rib-tank",
          en: "Everyday rib tank",
          ar: "توب يومي مضلع",
          shortEn: "A compact cotton foundation with a flattering neckline.",
          shortAr: "قطعة قطنية أساسية متماسكة بياقة أنيقة.",
          descriptionEn:
            "A close-fitting rib tank in soft compact cotton, designed to layer cleanly or wear alone.",
          descriptionAr: "توب مضلع بقصة قريبة من الجسم من القطن الناعم، مناسب للطبقات أو بمفرده.",
          price: 69900,
          sale: null,
          sku: "MM-BAS-07",
          stock: 31,
          category: "essentials",
          attributes: { brand: "Base Form", material: "Rib cotton", color: "Ivory", fit: "Slim" },
        },
        {
          key: "leather-loop-sandal",
          en: "Leather loop sandal",
          ar: "صندل جلدي بحلقات",
          shortEn: "Hand-finished leather with a cushioned everyday sole.",
          shortAr: "جلد مشطب يدوياً بنعل مريح للاستخدام اليومي.",
          descriptionEn:
            "A minimal slip-on sandal made by local artisans with a cushioned footbed and vegetable-tanned leather.",
          descriptionAr:
            "صندل بسيط سهل الارتداء من صنع حرفيين محليين بفرش مبطن وجلد مدبوغ نباتياً.",
          price: 139900,
          sale: 119900,
          sku: "MM-SND-08",
          stock: 12,
          category: "accessories",
          attributes: {
            brand: "Marsa Craft",
            material: "Leather",
            color: "Cognac",
            badge: "Handmade",
          },
        },
      ] as const;
      const activeDemoSlugs = demoProducts.map((item) => item.key);
      await transaction.ecommerceProduct.updateMany({
        where: { organizationId, storeId: commerceStoreId, slug: { notIn: activeDemoSlugs } },
        data: { archivedAt: new Date() },
      });
      for (const item of demoProducts) {
        const productId = stableUuid(`ecommerce-product:matrouh-market:${item.key}`);
        const product = await transaction.ecommerceProduct.upsert({
          where: { storeId_slug: { storeId: commerceStoreId, slug: item.key } },
          update: {
            status: "published",
            visibility: "public",
            basePriceMinor: item.price,
            salePriceMinor: item.sale,
            currency: "EGP",
            sku: item.sku,
            attributesJson: jsonInput(item.attributes),
            archivedAt: null,
          },
          create: {
            id: productId,
            organizationId,
            storeId: commerceStoreId,
            slug: item.key,
            status: "published",
            visibility: "public",
            basePriceMinor: item.price,
            salePriceMinor: item.sale,
            currency: "EGP",
            sku: item.sku,
            attributesJson: jsonInput(item.attributes),
          },
        });
        for (const locale of ["en", "ar"] as const) {
          const name = locale === "ar" ? item.ar : item.en;
          await transaction.ecommerceProductTranslation.upsert({
            where: { productId_locale: { productId: product.id, locale } },
            update: {
              name,
              shortDescription: locale === "ar" ? item.shortAr : item.shortEn,
              description: locale === "ar" ? item.descriptionAr : item.descriptionEn,
            },
            create: {
              productId: product.id,
              locale,
              name,
              shortDescription: locale === "ar" ? item.shortAr : item.shortEn,
              description: locale === "ar" ? item.descriptionAr : item.descriptionEn,
            },
          });
        }
        await transaction.ecommerceProductVariant.upsert({
          where: { productId_sku: { productId: product.id, sku: item.sku } },
          update: { title: "Standard", stockQuantity: item.stock, active: true },
          create: {
            id: stableUuid(`ecommerce-variant:${item.key}`),
            organizationId,
            productId: product.id,
            sku: item.sku,
            title: "Standard",
            stockQuantity: item.stock,
          },
        });
        const categoryId = categoryIds.get(item.category);
        if (!categoryId) throw new Error(`ECOMMERCE_DEMO_CATEGORY_MISSING:${item.category}`);
        await transaction.ecommerceProductCategory.upsert({
          where: { productId_categoryId: { productId: product.id, categoryId } },
          update: {},
          create: { productId: product.id, categoryId },
        });
      }
      for (const method of [
        { key: "cash_on_delivery", name: "Cash on delivery", enabled: true },
        { key: "bank_transfer", name: "Bank transfer", enabled: true },
      ]) {
        await transaction.ecommercePaymentMethod.upsert({
          where: { storeId_key: { storeId: commerceStoreId, key: method.key } },
          update: { displayName: method.name, enabled: method.enabled },
          create: {
            id: stableUuid(`ecommerce-payment:${method.key}`),
            organizationId,
            storeId: commerceStoreId,
            key: method.key,
            displayName: method.name,
            enabled: method.enabled,
          },
        });
      }
      for (const method of [
        { key: "standard_delivery", name: "Standard delivery", price: 7500 },
        { key: "store_pickup", name: "Store pickup", price: 0 },
      ]) {
        await transaction.ecommerceShippingMethod.upsert({
          where: { storeId_key: { storeId: commerceStoreId, key: method.key } },
          update: { displayName: method.name, enabled: true, priceMinor: method.price },
          create: {
            id: stableUuid(`ecommerce-shipping:${method.key}`),
            organizationId,
            storeId: commerceStoreId,
            key: method.key,
            displayName: method.name,
            enabled: true,
            priceMinor: method.price,
          },
        });
      }
    },
  );

  const hardwareTemplate = await database.ecommerceTemplateVersion.findFirst({
    where: { status: "ready", template: { slug: "hardware-store", status: "ready" } },
    include: { template: true },
  });
  if (!hardwareTemplate) throw new Error("ECOMMERCE_HARDWARE_DEMO_TEMPLATE_MISSING");
  const hardwareWebsiteId = stableUuid("website:matrouh-hardware-demo");
  const hardwareStoreId = stableUuid("ecommerce-store:matrouh-hardware-demo");
  await withTenantTransaction(
    database,
    { organizationId, actorId, correlationId: "seed-demo:ecommerce-hardware" },
    async (transaction) => {
      await transaction.website.upsert({
        where: { organizationId_id: { organizationId, id: hardwareWebsiteId } },
        update: {
          clientId: demoClientId,
          name: "Matrouh Forge",
          kind: "ecommerce",
          status: "published",
          templateId: `ecommerce:${hardwareTemplate.template.slug}`,
          templateVersion: hardwareTemplate.version,
          defaultLocale: "en",
        },
        create: {
          id: hardwareWebsiteId,
          organizationId,
          clientId: demoClientId,
          name: "Matrouh Forge",
          kind: "ecommerce",
          status: "published",
          templateId: `ecommerce:${hardwareTemplate.template.slug}`,
          templateVersion: hardwareTemplate.version,
          defaultLocale: "en",
        },
      });
      for (const locale of ["en", "ar"] as const) {
        await transaction.websiteLocale.upsert({
          where: { websiteId_locale: { websiteId: hardwareWebsiteId, locale } },
          update: { isDefault: locale === "en", fallbackLocale: locale === "en" ? null : "en" },
          create: {
            organizationId,
            websiteId: hardwareWebsiteId,
            locale,
            isDefault: locale === "en",
            fallbackLocale: locale === "en" ? null : "en",
          },
        });
      }
      await transaction.domain.upsert({
        where: { id: stableUuid("domain:tools.localhost") },
        update: {
          organizationId,
          websiteId: hardwareWebsiteId,
          hostnameNormalized: "tools.localhost",
          hostnameDisplay: "tools.localhost",
          status: "active",
          releasedAt: null,
        },
        create: {
          id: stableUuid("domain:tools.localhost"),
          organizationId,
          websiteId: hardwareWebsiteId,
          hostnameNormalized: "tools.localhost",
          hostnameDisplay: "tools.localhost",
          kind: "subdomain",
          status: "active",
        },
      });
      await transaction.ecommerceStore.upsert({
        where: { organizationId_id: { organizationId, id: hardwareStoreId } },
        update: {
          websiteId: hardwareWebsiteId,
          ownerUserId: demoClientUserId,
          ecommerceTemplateVersionId: hardwareTemplate.id,
          name: "Matrouh Forge",
          slug: "matrouh-forge",
          status: "active",
          defaultLocale: "en",
          currency: "EGP",
          contactEmail: "trade@matrouh.local",
          contactPhone: demoCommercePhone,
          brandingJson: jsonInput({ primary: "#111619", accent: "#ffb000" }),
          settingsJson: jsonInput({ allowAppearanceToggle: true }),
        },
        create: {
          id: hardwareStoreId,
          organizationId,
          websiteId: hardwareWebsiteId,
          ownerUserId: demoClientUserId,
          ecommerceTemplateVersionId: hardwareTemplate.id,
          name: "Matrouh Forge",
          slug: "matrouh-forge",
          status: "active",
          defaultLocale: "en",
          currency: "EGP",
          contactEmail: "trade@matrouh.local",
          contactPhone: demoCommercePhone,
          brandingJson: jsonInput({ primary: "#111619", accent: "#ffb000" }),
          settingsJson: jsonInput({ allowAppearanceToggle: true }),
        },
      });
      for (const locale of ["en", "ar"] as const) {
        await transaction.ecommerceStoreLocale.upsert({
          where: { storeId_locale: { storeId: hardwareStoreId, locale } },
          update: {
            organizationId,
            isDefault: locale === "en",
            storeName: locale === "ar" ? "مطروح فورج" : "Matrouh Forge",
            description:
              locale === "ar"
                ? "أدوات احترافية ومعدات أصلية ودعم فني واضح."
                : "Professional tools, genuine hardware, and straight-talking technical support.",
            footerText:
              locale === "ar"
                ? "معدات موثوقة للمحترفين وصنّاع المشاريع."
                : "Reliable equipment for tradespeople and serious makers.",
          },
          create: {
            organizationId,
            storeId: hardwareStoreId,
            locale,
            isDefault: locale === "en",
            storeName: locale === "ar" ? "مطروح فورج" : "Matrouh Forge",
            description:
              locale === "ar"
                ? "أدوات احترافية ومعدات أصلية ودعم فني واضح."
                : "Professional tools, genuine hardware, and straight-talking technical support.",
            footerText:
              locale === "ar"
                ? "معدات موثوقة للمحترفين وصنّاع المشاريع."
                : "Reliable equipment for tradespeople and serious makers.",
          },
        });
      }
      const hardwareCategories = [
        {
          key: "power-tools",
          en: "Power tools",
          ar: "أدوات كهربائية",
          enDescription: "Cordless and corded performance",
          arDescription: "أداء لاسلكي وسلكي",
        },
        {
          key: "hand-tools",
          en: "Hand tools",
          ar: "أدوات يدوية",
          enDescription: "Workshop essentials",
          arDescription: "أساسيات الورشة",
        },
        {
          key: "fasteners",
          en: "Fasteners",
          ar: "مثبتات",
          enDescription: "Fixings for every material",
          arDescription: "تثبيت لكل خامة",
        },
        {
          key: "cutting",
          en: "Cutting",
          ar: "القطع",
          enDescription: "Blades, saws, and accessories",
          arDescription: "شفرات ومناشير وملحقات",
        },
        {
          key: "paint",
          en: "Paint & finish",
          ar: "دهانات وتشطيب",
          enDescription: "Prepare, coat, and finish",
          arDescription: "تجهيز وطلاء وتشطيب",
        },
        {
          key: "storage",
          en: "Storage",
          ar: "التخزين",
          enDescription: "Organize the jobsite",
          arDescription: "نظّم موقع العمل",
        },
      ] as const;
      const hardwareCategoryIds = new Map<string, string>();
      for (const [position, item] of hardwareCategories.entries()) {
        const categoryId = stableUuid(`ecommerce-category:matrouh-forge:${item.key}`);
        hardwareCategoryIds.set(item.key, categoryId);
        await transaction.ecommerceCategory.upsert({
          where: { storeId_slug: { storeId: hardwareStoreId, slug: item.key } },
          update: { visible: true, position },
          create: {
            id: categoryId,
            organizationId,
            storeId: hardwareStoreId,
            slug: item.key,
            position,
          },
        });
        for (const locale of ["en", "ar"] as const) {
          const name = locale === "ar" ? item.ar : item.en;
          const description = locale === "ar" ? item.arDescription : item.enDescription;
          await transaction.ecommerceCategoryTranslation.upsert({
            where: { categoryId_locale: { categoryId, locale } },
            update: { name, description },
            create: { categoryId, locale, name, description },
          });
        }
      }
      const hardwareProducts = [
        {
          key: "voltmax-brushless-drill",
          en: "18V brushless drill driver",
          ar: "مثقاب لاسلكي ١٨ فولت بدون فرش",
          shortEn: "Compact high-torque drill with two batteries and hard case.",
          shortAr: "مثقاب مدمج بعزم قوي مع بطاريتين وحقيبة صلبة.",
          descriptionEn:
            "A professional brushless drill driver with 65 Nm torque, all-metal chuck, two 4.0 Ah batteries, and rapid charger.",
          descriptionAr:
            "مثقاب احترافي بدون فرش بعزم ٦٥ نيوتن متر وظرف معدني وبطاريتين ٤ أمبير وشاحن سريع.",
          price: 649900,
          sale: 589900,
          sku: "VMX-DD18-65",
          stock: 16,
          category: "power-tools",
          attributes: {
            brand: "VoltMax",
            power: "18V · 65 Nm",
            compatibility: "VMX 18V",
            warranty: "3 years",
            badge: "Trade deal",
            featured: true,
          },
        },
        {
          key: "titan-angle-grinder",
          en: "125mm angle grinder",
          ar: "صاروخ قطع ١٢٥ مم",
          shortEn: "Slim-body 1,100W grinder with restart protection.",
          shortAr: "صاروخ ١١٠٠ وات بجسم نحيف وحماية من إعادة التشغيل.",
          descriptionEn:
            "A durable 125 mm grinder with a 1,100W motor, tool-free guard, anti-vibration handle, and restart protection.",
          descriptionAr:
            "صاروخ متين ١٢٥ مم بمحرك ١١٠٠ وات وواقي سريع ومقبض مضاد للاهتزاز وحماية إعادة التشغيل.",
          price: 389900,
          sale: null,
          sku: "TTN-AG125",
          stock: 11,
          category: "power-tools",
          attributes: {
            brand: "Titan Pro",
            power: "1,100W",
            compatibility: "125mm discs",
            warranty: "2 years",
            featured: true,
          },
        },
        {
          key: "forge-ratchet-set",
          en: "72-tooth ratchet set",
          ar: "طقم راشيت ٧٢ سنة",
          shortEn: "Chrome vanadium socket set in a fitted case.",
          shortAr: "طقم لقم كروم فاناديوم في حقيبة منظمة.",
          descriptionEn:
            "A 46-piece metric socket set with a fine 72-tooth ratchet, extension bars, and precision bits.",
          descriptionAr: "طقم لقم متري ٤٦ قطعة براشيت دقيق ٧٢ سنة ووصلات ولقم مفكات.",
          price: 249900,
          sale: 219900,
          sku: "FRG-RS46",
          stock: 24,
          category: "hand-tools",
          attributes: {
            brand: "Forge",
            material: "Cr-V steel",
            compatibility: "1/4 inch",
            warranty: "Lifetime",
            badge: "Bestseller",
          },
        },
        {
          key: "impact-screw-pack",
          en: "Structural screw trade pack",
          ar: "عبوة مسامير إنشائية للمحترفين",
          shortEn: "High-load zinc-coated screws for timber construction.",
          shortAr: "مسامير مطلية بالزنك للأحمال العالية في الأخشاب.",
          descriptionEn:
            "A 100-piece pack of 8 × 120 mm structural screws with self-cutting tip and corrosion-resistant coating.",
          descriptionAr: "عبوة ١٠٠ مسمار إنشائي ٨ × ١٢٠ مم بطرف ذاتي القطع وطلاء مقاوم للتآكل.",
          price: 119900,
          sale: null,
          sku: "FIX-8120-Z",
          stock: 42,
          category: "fasteners",
          attributes: {
            brand: "FixRight",
            material: "Zinc steel",
            compatibility: "Timber",
            packSize: "100 pcs",
          },
        },
        {
          key: "carbide-circular-blade",
          en: "Carbide circular saw blade",
          ar: "شفرة منشار دائري كربيد",
          shortEn: "Precision 60-tooth blade for clean timber and laminate cuts.",
          shortAr: "شفرة دقيقة ٦٠ سنة لقطع نظيف للخشب واللامينيت.",
          descriptionEn:
            "A 190 × 30 mm tungsten-carbide blade engineered for low-vibration, fine crosscuts in timber and laminate.",
          descriptionAr:
            "شفرة تنجستن كربيد ١٩٠ × ٣٠ مم منخفضة الاهتزاز للقطع العرضي الدقيق في الخشب واللامينيت.",
          price: 139900,
          sale: 119900,
          sku: "CUT-190-60T",
          stock: 19,
          category: "cutting",
          attributes: {
            brand: "EdgeCraft",
            material: "TCT",
            compatibility: "190 × 30mm",
            bladeTeeth: "60T",
          },
        },
        {
          key: "profinish-wall-paint",
          en: "ProFinish washable wall paint",
          ar: "دهان حوائط برو فينيش قابل للغسيل",
          shortEn: "Low-odor interior emulsion with durable matte coverage.",
          shortAr: "دهان داخلي منخفض الرائحة بتغطية مطفية متينة.",
          descriptionEn:
            "A premium 10-liter washable interior paint with low VOC, high opacity, and smooth matte finish.",
          descriptionAr:
            "دهان داخلي فاخر ١٠ لترات قابل للغسيل ومنخفض المركبات العضوية بتغطية عالية وتشطيب مطفي.",
          price: 279900,
          sale: null,
          sku: "PFT-MAT-10",
          stock: 27,
          category: "paint",
          attributes: {
            brand: "ProFinish",
            material: "Water based",
            compatibility: "Interior walls",
            coverage: "120 m²",
          },
        },
        {
          key: "stack-system-toolbox",
          en: "Modular rolling toolbox",
          ar: "صندوق أدوات متحرك معياري",
          shortEn: "IP65 modular storage with reinforced wheels and handle.",
          shortAr: "تخزين معياري IP65 بعجلات ومقبض معززين.",
          descriptionEn:
            "A weather-sealed rolling toolbox with removable tray, metal latches, and compatibility with Stack System modules.",
          descriptionAr:
            "صندوق أدوات متحرك محكم ضد الطقس بدرج قابل للإزالة وأقفال معدنية ومتوافق مع وحدات ستاك سيستم.",
          price: 449900,
          sale: 399900,
          sku: "STK-ROLL-01",
          stock: 8,
          category: "storage",
          attributes: {
            brand: "Stack System",
            material: "Impact polymer",
            compatibility: "Stack System",
            rating: "IP65",
            badge: "New",
          },
        },
        {
          key: "engineer-claw-hammer",
          en: "Anti-vibration claw hammer",
          ar: "شاكوش مخلب مضاد للاهتزاز",
          shortEn: "One-piece forged steel with a balanced 20oz head.",
          shortAr: "فولاذ مطروق من قطعة واحدة برأس متوازن ٢٠ أونصة.",
          descriptionEn:
            "A one-piece forged hammer with magnetic nail starter, milled face, and vibration-reducing grip.",
          descriptionAr:
            "شاكوش مطروق من قطعة واحدة بمثبت مسمار مغناطيسي ووجه محزز ومقبض يقلل الاهتزاز.",
          price: 169900,
          sale: null,
          sku: "ENG-HM20",
          stock: 33,
          category: "hand-tools",
          attributes: {
            brand: "Engineer",
            material: "Forged steel",
            weight: "20 oz",
            warranty: "Lifetime",
          },
        },
      ] as const;
      for (const item of hardwareProducts) {
        const productId = stableUuid(`ecommerce-product:matrouh-forge:${item.key}`);
        const product = await transaction.ecommerceProduct.upsert({
          where: { storeId_slug: { storeId: hardwareStoreId, slug: item.key } },
          update: {
            status: "published",
            visibility: "public",
            basePriceMinor: item.price,
            salePriceMinor: item.sale,
            currency: "EGP",
            sku: item.sku,
            attributesJson: jsonInput(item.attributes),
            archivedAt: null,
          },
          create: {
            id: productId,
            organizationId,
            storeId: hardwareStoreId,
            slug: item.key,
            status: "published",
            visibility: "public",
            basePriceMinor: item.price,
            salePriceMinor: item.sale,
            currency: "EGP",
            sku: item.sku,
            attributesJson: jsonInput(item.attributes),
          },
        });
        for (const locale of ["en", "ar"] as const) {
          const name = locale === "ar" ? item.ar : item.en;
          await transaction.ecommerceProductTranslation.upsert({
            where: { productId_locale: { productId: product.id, locale } },
            update: {
              name,
              shortDescription: locale === "ar" ? item.shortAr : item.shortEn,
              description: locale === "ar" ? item.descriptionAr : item.descriptionEn,
            },
            create: {
              productId: product.id,
              locale,
              name,
              shortDescription: locale === "ar" ? item.shortAr : item.shortEn,
              description: locale === "ar" ? item.descriptionAr : item.descriptionEn,
            },
          });
        }
        await transaction.ecommerceProductVariant.upsert({
          where: { productId_sku: { productId: product.id, sku: item.sku } },
          update: { title: "Standard", stockQuantity: item.stock, active: true },
          create: {
            id: stableUuid(`ecommerce-variant:matrouh-forge:${item.key}`),
            organizationId,
            productId: product.id,
            sku: item.sku,
            title: "Standard",
            stockQuantity: item.stock,
          },
        });
        const categoryId = hardwareCategoryIds.get(item.category);
        if (!categoryId) throw new Error(`ECOMMERCE_HARDWARE_CATEGORY_MISSING:${item.category}`);
        await transaction.ecommerceProductCategory.upsert({
          where: { productId_categoryId: { productId: product.id, categoryId } },
          update: {},
          create: { productId: product.id, categoryId },
        });
      }
      for (const method of [
        { key: "cash_on_delivery", name: "Cash on delivery" },
        { key: "bank_transfer", name: "Bank transfer" },
      ]) {
        await transaction.ecommercePaymentMethod.upsert({
          where: { storeId_key: { storeId: hardwareStoreId, key: method.key } },
          update: { displayName: method.name, enabled: true },
          create: {
            id: stableUuid(`ecommerce-payment:matrouh-forge:${method.key}`),
            organizationId,
            storeId: hardwareStoreId,
            key: method.key,
            displayName: method.name,
            enabled: true,
          },
        });
      }
      for (const method of [
        { key: "express_cairo", name: "Express Cairo delivery", price: 12500 },
        { key: "trade_pickup", name: "Trade counter pickup", price: 0 },
      ]) {
        await transaction.ecommerceShippingMethod.upsert({
          where: { storeId_key: { storeId: hardwareStoreId, key: method.key } },
          update: { displayName: method.name, enabled: true, priceMinor: method.price },
          create: {
            id: stableUuid(`ecommerce-shipping:matrouh-forge:${method.key}`),
            organizationId,
            storeId: hardwareStoreId,
            key: method.key,
            displayName: method.name,
            enabled: true,
            priceMinor: method.price,
          },
        });
      }
    },
  );

  console.log(
    `Seeded ${seeded} demo websites, publications, domains, and artifacts for organization ${organizationId}`,
  );
  console.log(`Staff account: owner@matrouh.local / ${demoPassword}`);
  console.log(`Client account: client@matrouh.local / ${demoPassword}`);
  console.log("Fashion storefront: http://shop.localhost:3000");
  console.log("Hardware storefront: http://tools.localhost:3000");
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
