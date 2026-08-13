import { join } from "node:path";
import { withTenantTransaction } from "@factory/database";
import type { JsonValue } from "@factory/template-sdk";
import { discoverTemplates, loadTemplate } from "@factory/template-loader";
import { dashboardDatabase } from "@/server/overview";
import { requireClientAccountContext, requireDashboardContext } from "@/server/auth";
import { dashboardMediaPath } from "@/server/media-storage";
import { supportedTemplateLocales } from "@/server/template-locales";

const templatesRoot = join(process.cwd(), "..", "..", "templates");

export interface WebsiteEditor {
  templateFeatures: string[];
  templateCategory: string;
  website: {
    id: string;
    name: string;
    status: string;
    templateId: string;
    templateVersion: string;
    defaultLocale: string;
    locales: string[];
    draftRevision: string;
    activePublicationId: string | null;
    pendingUpdate: boolean;
    hostname: string | null;
    clientId: string | null;
    clientEmail: string | null;
    faviconAssetId: string | null;
    whiteLabelEnabled: boolean;
  };
  mediaAssets: { id: string; name: string; url: string }[];
  settings: { id: string; content: string; revision: string } | null;
  theme: { id: string; tokens: string; revision: string } | null;
  navigation: {
    id: string;
    title: string;
    locale: string | null;
    revision: string;
    nodes: { id: string; labels: Record<string, string>; kind: string; revision: string }[];
  }[];
  availableTemplateVersions: string[];
  supportedLocales: string[];
  pages: {
    id: string;
    title: string;
    slug: string;
    locale: string;
    revision: string;
    seo: {
      title: string;
      description: string;
      keywords: string[];
      index: boolean;
      follow: boolean;
    };
    allowedSections: {
      id: string;
      title: string;
      canAdd: boolean;
    }[];
    sections: {
      id: string;
      sectionTypeId: string;
      title: string;
      content: unknown;
      revision: string;
      canDelete: boolean;
      canDuplicate: boolean;
      fields: {
        name: string;
        label: string;
        control: string;
        value: string;
        required: boolean;
      }[];
    }[];
  }[];
  publications: {
    id: string;
    sequenceNumber: string;
    sourceDraftRevision: string;
    templateVersion: string;
    status: string;
    failureCode: string | null;
    createdAt: Date;
    readyAt: Date | null;
  }[];
  latestPublishJob: {
    id: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    createdAt: Date;
  } | null;
}

export async function loadWebsiteEditor(websiteId: string): Promise<WebsiteEditor | null> {
  return loadWebsiteEditorForContext(websiteId, false);
}

export async function loadClientWebsiteEditor(websiteId: string): Promise<WebsiteEditor | null> {
  return loadWebsiteEditorForContext(websiteId, true);
}

async function loadWebsiteEditorForContext(
  websiteId: string,
  clientScoped: boolean,
): Promise<WebsiteEditor | null> {
  const client = dashboardDatabase();
  const context = clientScoped
    ? await requireClientAccountContext()
    : await requireDashboardContext("website.read");
  const organization = context.organization;

  const editorData = await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId: context.actor.id, correlationId: "editor-load" },
    async (transaction) => {
      const website = await transaction.website.findFirst({
        where: {
          organizationId: organization.id,
          id: websiteId,
          ...(clientScoped
            ? {
                client: {
                  archivedAt: null,
                  contactEmail: { equals: context.actor.email, mode: "insensitive" as const },
                },
              }
            : {}),
        },
        include: {
          activePublication: { select: { sourceDraftRevision: true } },
          client: { select: { contactEmail: true } },
        },
      });
      if (!website) return null;

      const pages = await transaction.pageDraft.findMany({
        where: { organizationId: organization.id, websiteId, deletedAt: null },
        orderBy: { orderKey: "asc" },
      });
      const sections = await transaction.sectionDraft.findMany({
        where: { organizationId: organization.id, websiteId, deletedAt: null },
        orderBy: [{ pageId: "asc" }, { orderKey: "asc" }],
      });
      const seoDrafts = await transaction.seoDraft.findMany({
        where: { organizationId: organization.id, websiteId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
      });
      const publications = await transaction.publication.findMany({
        where: { organizationId: organization.id, websiteId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const domains = await transaction.domain.findMany({
        where: { organizationId: organization.id, websiteId, status: "active" },
        orderBy: { createdAt: "asc" },
        take: 1,
      });
      const mediaDomain = await transaction.domain.findFirst({
        where: { organizationId: organization.id, websiteId },
        orderBy: { createdAt: "asc" },
        select: { hostnameNormalized: true },
      });
      const locales = await transaction.websiteLocale.findMany({
        where: { websiteId },
        orderBy: [{ isDefault: "desc" }, { locale: "asc" }],
      });
      const settingsDrafts = await transaction.websiteSettingsDraft.findMany({
        where: { organizationId: organization.id, websiteId, locale: null },
        take: 1,
      });
      const themeDrafts = await transaction.themeDraft.findMany({
        where: { organizationId: organization.id, websiteId, locale: null, deletedAt: null },
        take: 1,
      });
      const navigationDrafts = await transaction.navigationDraft.findMany({
        where: { organizationId: organization.id, websiteId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      const navigationNodes = await transaction.navigationNodeDraft.findMany({
        where: {
          organizationId: organization.id,
          websiteId,
          navigationId: { in: navigationDrafts.map((navigation) => navigation.id) },
          deletedAt: null,
        },
        orderBy: [{ navigationId: "asc" }, { orderKey: "asc" }, { id: "asc" }],
      });
      const websiteFolder = await transaction.mediaFolder.findFirst({
        where: {
          organizationId: organization.id,
          parentFolderId: null,
          archivedAt: null,
          name: mediaDomain?.hostnameNormalized ?? website.name,
        },
        select: { id: true },
      });
      const mediaAssets = websiteFolder
        ? await transaction.mediaAsset.findMany({
            where: {
              organizationId: organization.id,
              folderId: websiteFolder.id,
              status: "ready",
              kind: "image",
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, originalFilename: true },
            take: 100,
          })
        : [];
      const latestPublishJob = await transaction.job.findFirst({
        where: {
          organizationId: organization.id,
          type: "publication.requested",
          version: 1,
          payloadJson: { path: ["websiteId"], equals: websiteId },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          attemptCount: true,
          maxAttempts: true,
          createdAt: true,
        },
      });

      return {
        website,
        pages: pages.map((page) => ({
          ...page,
          sections: sections.filter((section) => section.pageId === page.id),
          seoDrafts: seoDrafts.filter((seo) => seo.pageId === page.id),
        })),
        publications,
        domains,
        locales,
        settingsDrafts,
        themeDrafts,
        navigationDrafts: navigationDrafts.map((navigation) => ({
          ...navigation,
          nodes: navigationNodes.filter((node) => node.navigationId === navigation.id),
        })),
        mediaAssets,
        latestPublishJob,
      };
    },
  );
  if (!editorData) return null;
  const website = editorData.website;

  const candidate = (await discoverTemplates(templatesRoot)).find(
    (item) =>
      item.discovery.templateId === website.templateId &&
      item.discovery.templateVersion === website.templateVersion,
  );
  if (!candidate) return null;

  const template = await loadTemplate(candidate);
  const discoveredVersions = new Set(
    (await discoverTemplates(templatesRoot))
      .filter((item) => item.discovery.templateId === website.templateId)
      .map((item) => item.discovery.templateVersion),
  );
  const catalogVersions = await client.templateVersionRecord.findMany({
    where: {
      templateId: website.templateId,
      lifecycleStatus: "ready",
      validationStatus: "valid",
      templateVersion: { not: website.templateVersion },
    },
    select: { templateVersion: true },
  });
  return {
    templateFeatures: [...(template.manifest.features ?? [])],
    templateCategory: template.manifest.category,
    website: {
      id: website.id,
      name: website.name,
      status: website.status,
      templateId: website.templateId,
      templateVersion: website.templateVersion,
      defaultLocale: website.defaultLocale,
      locales: editorData.locales.map((item) => item.locale),
      draftRevision: website.draftRevision.toString(),
      activePublicationId: website.activePublicationId,
      pendingUpdate:
        website.status === "published" &&
        website.activePublication !== null &&
        website.activePublication?.sourceDraftRevision !== website.draftRevision,
      hostname: editorData.domains[0]?.hostnameNormalized ?? null,
      clientId: website.clientId,
      clientEmail: website.client?.contactEmail ?? null,
      faviconAssetId: website.faviconAssetId,
      whiteLabelEnabled: website.whiteLabelEnabled,
    },
    mediaAssets: editorData.mediaAssets.map((asset) => ({
      id: asset.id,
      name: asset.originalFilename,
      url: dashboardMediaPath(asset.id),
    })),
    latestPublishJob: editorData.latestPublishJob,
    settings: editorData.settingsDrafts[0]
      ? {
          id: editorData.settingsDrafts[0].id,
          content: JSON.stringify(editorData.settingsDrafts[0].contentJson, null, 2),
          revision: editorData.settingsDrafts[0].revision.toString(),
        }
      : null,
    theme: editorData.themeDrafts[0]
      ? {
          id: editorData.themeDrafts[0].id,
          tokens: JSON.stringify(editorData.themeDrafts[0].tokensJson, null, 2),
          revision: editorData.themeDrafts[0].revision.toString(),
        }
      : null,
    navigation: editorData.navigationDrafts.map((navigation) => ({
      id: navigation.id,
      title:
        template.navigation.find((definition) => definition.id === navigation.definitionId)
          ?.title ?? navigation.definitionId,
      locale: navigation.locale,
      revision: navigation.revision.toString(),
      nodes: navigation.nodes.map((node) => ({
        id: node.id,
        labels: Object.fromEntries(
          editorData.locales.map(({ locale }) => [locale, localizedLabel(node.labelJson, locale)]),
        ),
        kind: node.nodeKind,
        revision: node.revision.toString(),
      })),
    })),
    availableTemplateVersions: catalogVersions
      .map((item) => item.templateVersion)
      .filter(
        (version) =>
          discoveredVersions.has(version) &&
          version.localeCompare(website.templateVersion, undefined, { numeric: true }) > 0,
      )
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true })),
    supportedLocales: [...supportedTemplateLocales(template)],
    pages: editorData.pages.map((page) => {
      const pageDefinition = template.pages.find((item) => item.id === page.pageTypeId);
      const counts = new Map<string, number>();
      page.sections.forEach((section) =>
        counts.set(section.sectionTypeId, (counts.get(section.sectionTypeId) ?? 0) + 1),
      );
      const maximumFor = (sectionTypeId: string): number | undefined =>
        pageDefinition?.requiredSections.find((item) => item.sectionTypeId === sectionTypeId)
          ?.maximum;
      const minimumFor = (sectionTypeId: string): number =>
        pageDefinition?.requiredSections.find((item) => item.sectionTypeId === sectionTypeId)
          ?.minimum ?? 0;
      return {
        id: page.id,
        title: page.title,
        slug: page.slug,
        locale: page.locale,
        revision: page.revision.toString(),
        seo: seoValues(page.seoDrafts[0]?.metadataJson),
        allowedSections: (pageDefinition?.allowedSections ?? []).flatMap((sectionTypeId) => {
          const definition = template.sections.find((item) => item.id === sectionTypeId);
          if (!definition) return [];
          const maximum = maximumFor(sectionTypeId);
          return [
            {
              id: definition.id,
              title: definition.title,
              canAdd: maximum === undefined || (counts.get(sectionTypeId) ?? 0) < maximum,
            },
          ];
        }),
        sections: page.sections.map((section) => {
          const definition = template.sections.find((item) => item.id === section.sectionTypeId);
          const count = counts.get(section.sectionTypeId) ?? 0;
          const maximum = maximumFor(section.sectionTypeId);
          return {
            id: section.id,
            sectionTypeId: section.sectionTypeId,
            title: definition?.title ?? section.sectionTypeId,
            content: section.contentJson,
            revision: section.revision.toString(),
            canDelete: count > minimumFor(section.sectionTypeId),
            canDuplicate: maximum === undefined || count < maximum,
            fields: fieldEditors(definition?.schema, section.contentJson),
          };
        }),
      };
    }),
    publications: editorData.publications.map((publication) => ({
      id: publication.id,
      sequenceNumber: publication.sequenceNumber.toString(),
      sourceDraftRevision: publication.sourceDraftRevision.toString(),
      templateVersion: publication.templateVersion,
      status: publication.status,
      failureCode: publication.failureCode,
      createdAt: publication.createdAt,
      readyAt: publication.readyAt,
    })),
  };
}

function seoValues(value: unknown): WebsiteEditor["pages"][number]["seo"] {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const robots =
    record.robots && typeof record.robots === "object" && !Array.isArray(record.robots)
      ? (record.robots as Record<string, unknown>)
      : {};
  return {
    title: typeof record.title === "string" ? record.title : "",
    description: typeof record.description === "string" ? record.description : "",
    keywords: Array.isArray(record.keywords)
      ? record.keywords.filter((item): item is string => typeof item === "string")
      : [],
    index: typeof robots.index === "boolean" ? robots.index : true,
    follow: typeof robots.follow === "boolean" ? robots.follow : true,
  };
}

function localizedLabel(value: unknown, locale: string): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Untitled";
  const labels = value as Record<string, unknown>;
  const preferred = labels[locale];
  if (typeof preferred === "string") return preferred;
  return (
    Object.values(labels).find((item): item is string => typeof item === "string") ?? "Untitled"
  );
}

function fieldEditors(
  schema:
    | {
        fields: Readonly<Record<string, { label: string; control?: string }>>;
        toPortableSchema(): { jsonSchema: JsonValue };
      }
    | undefined,
  content: unknown,
): WebsiteEditor["pages"][number]["sections"][number]["fields"] {
  if (!schema) return [];
  const portable = schema.toPortableSchema().jsonSchema;
  const portableRecord =
    portable && typeof portable === "object" && !Array.isArray(portable)
      ? (portable as Record<string, JsonValue>)
      : {};
  const required = new Set(
    Array.isArray(portableRecord.required)
      ? portableRecord.required.filter((item): item is string => typeof item === "string")
      : [],
  );
  return Object.entries(schema.fields)
    .filter(([pointer]) => /^\/[A-Za-z0-9_-]+$/.test(pointer))
    .map(([pointer, metadata]) => {
      const name = pointer.slice(1);
      return {
        name,
        label: metadata.label,
        control: metadata.control ?? "text",
        value: stringifyField(readObjectField(content, name)),
        required: required.has(name),
      };
    });
}

function readObjectField(value: unknown, key: string): JsonValue | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return (value as Record<string, JsonValue>)[key];
}

function stringifyField(value: JsonValue | undefined): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value !== undefined) return JSON.stringify(value, null, 2);
  return "";
}
