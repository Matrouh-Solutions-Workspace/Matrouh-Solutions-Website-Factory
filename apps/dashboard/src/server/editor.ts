import { join } from "node:path";
import { withTenantTransaction } from "@factory/database";
import type { JsonValue } from "@factory/template-sdk";
import { discoverTemplates, loadTemplate } from "@factory/template-loader";
import { dashboardDatabase } from "@/server/overview";
import { requireDashboardContext } from "@/server/auth";

const templatesRoot = join(process.cwd(), "..", "..", "templates");

export interface WebsiteEditor {
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
    hostname: string | null;
  };
  settings: { id: string; content: string; revision: string } | null;
  theme: { id: string; tokens: string; revision: string } | null;
  navigation: {
    id: string;
    title: string;
    revision: string;
    nodes: { id: string; label: string; kind: string; revision: string }[];
  }[];
  availableTemplateVersions: string[];
  pages: {
    id: string;
    title: string;
    slug: string;
    locale: string;
    revision: string;
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
}

export async function loadWebsiteEditor(websiteId: string): Promise<WebsiteEditor | null> {
  const client = dashboardDatabase();
  const context = await requireDashboardContext("website.read");
  const organization = context.organization;

  const website = await withTenantTransaction(
    client,
    { organizationId: organization.id, actorId: context.actor.id, correlationId: "editor-load" },
    (transaction) =>
      transaction.website.findUnique({
        where: { organizationId_id: { organizationId: organization.id, id: websiteId } },
        include: {
          pages: {
            where: { deletedAt: null },
            orderBy: { orderKey: "asc" },
            include: {
              sections: {
                where: { deletedAt: null },
                orderBy: { orderKey: "asc" },
              },
            },
          },
          publications: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          domains: { where: { status: "active" }, orderBy: { createdAt: "asc" }, take: 1 },
          locales: { orderBy: [{ isDefault: "desc" }, { locale: "asc" }] },
          settingsDrafts: { where: { locale: null }, take: 1 },
          themeDrafts: { where: { locale: null, deletedAt: null }, take: 1 },
          navigationDrafts: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: {
              nodes: { where: { deletedAt: null }, orderBy: [{ orderKey: "asc" }, { id: "asc" }] },
            },
          },
        },
      }),
  );
  if (!website) return null;

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
    website: {
      id: website.id,
      name: website.name,
      status: website.status,
      templateId: website.templateId,
      templateVersion: website.templateVersion,
      defaultLocale: website.defaultLocale,
      locales: website.locales.map((item) => item.locale),
      draftRevision: website.draftRevision.toString(),
      activePublicationId: website.activePublicationId,
      hostname: website.domains[0]?.hostnameNormalized ?? null,
    },
    settings: website.settingsDrafts[0]
      ? {
          id: website.settingsDrafts[0].id,
          content: JSON.stringify(website.settingsDrafts[0].contentJson, null, 2),
          revision: website.settingsDrafts[0].revision.toString(),
        }
      : null,
    theme: website.themeDrafts[0]
      ? {
          id: website.themeDrafts[0].id,
          tokens: JSON.stringify(website.themeDrafts[0].tokensJson, null, 2),
          revision: website.themeDrafts[0].revision.toString(),
        }
      : null,
    navigation: website.navigationDrafts.map((navigation) => ({
      id: navigation.id,
      title:
        template.navigation.find((definition) => definition.id === navigation.definitionId)
          ?.title ?? navigation.definitionId,
      revision: navigation.revision.toString(),
      nodes: navigation.nodes.map((node) => ({
        id: node.id,
        label: localizedLabel(node.labelJson, website.defaultLocale),
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
    pages: website.pages.map((page) => {
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
    publications: website.publications.map((publication) => ({
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
