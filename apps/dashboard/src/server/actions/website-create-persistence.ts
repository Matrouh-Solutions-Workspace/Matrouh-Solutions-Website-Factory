import { randomUUID } from "node:crypto";
import { localizeTemplateDefault, localizedTemplateTitle } from "@factory/content";
import { withTenantTransaction, type DatabaseTransaction } from "@factory/database";
import type { JsonValue, TemplateDefinition } from "@factory/template-sdk";
import type { WebsiteLanguageSelection } from "../website-languages";

interface WebsiteCreationPersistenceInput {
  organizationId: string;
  actorId: string;
  websiteId: string;
  clientId: string | null;
  name: string;
  templateId: string;
  templateVersion: string;
  hostname: string;
  cadence: "trial" | "monthly" | "yearly" | null;
  expiresAt: Date | null;
  languages: WebsiteLanguageSelection;
  template: TemplateDefinition;
}

function jsonInput(value: unknown): Exclude<JsonValue, null> {
  return value as Exclude<JsonValue, null>;
}

function slugFromTitle(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "home" ? "/" : slug || "/";
}

export async function persistWebsiteCreation(
  client: Parameters<typeof withTenantTransaction>[0],
  input: WebsiteCreationPersistenceInput,
): Promise<void> {
  const {
    organizationId,
    actorId,
    websiteId,
    clientId,
    name,
    templateId,
    templateVersion,
    hostname,
    cadence,
    expiresAt,
    languages,
    template,
  } = input;
  await withTenantTransaction(
    client,
    { organizationId, actorId, correlationId: `create-website:${websiteId}` },
    async (transaction: DatabaseTransaction) => {
      if (clientId) {
        const assignedClient = await transaction.client.findUnique({
          where: { organizationId_id: { organizationId, id: clientId } },
          select: { id: true },
        });
        if (!assignedClient) throw new Error("CLIENT_NOT_FOUND");
      }
      await transaction.website.create({
        data: {
          id: websiteId,
          organizationId,
          clientId,
          name,
          status: "draft",
          templateId,
          templateVersion,
          defaultLocale: languages.defaultLocale,
        },
      });
      if (cadence && expiresAt)
        await transaction.websiteSubscription.create({
          data: {
            id: randomUUID(),
            organizationId,
            websiteId,
            clientId,
            cadence,
            startsAt: new Date(),
            expiresAt,
          },
        });
      await transaction.websiteLocale.createMany({
        data: languages.locales.map((locale) => ({
          organizationId,
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
          organizationId,
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
          organizationId,
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
          organizationId,
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
          organizationId,
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
      const createdPages: { id: string; pageTypeId: string; title: string; locale: string }[] = [];
      for (const locale of languages.locales)
        for (const [pageIndex, page] of template.pages.entries()) {
          const pageId = randomUUID();
          const localizedTitle = localizedTemplateTitle(page.title, locale);
          createdPages.push({ id: pageId, pageTypeId: page.id, title: localizedTitle, locale });
          await transaction.pageDraft.create({
            data: {
              id: pageId,
              organizationId,
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
                    organizationId,
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
          if (sections.length > 0) await transaction.sectionDraft.createMany({ data: sections });
        }
      for (const definition of template.navigation)
        for (const navigationLocale of definition.localization === "localized-tree"
          ? languages.locales
          : [null]) {
          const navigationId = randomUUID();
          await transaction.navigationDraft.create({
            data: {
              id: navigationId,
              organizationId,
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
              organizationId,
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
    },
  );
}
