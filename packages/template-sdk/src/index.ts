import type { ReactNode } from "react";
import { z } from "zod";
import { TEMPLATE_MANIFEST_FORMAT_VERSION } from "./version";

export { TEMPLATE_MANIFEST_FORMAT_VERSION, TEMPLATE_SDK_VERSION } from "./version";
export { z };

export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type TemplateId = Brand<string, "TemplateId">;
export type TemplateVersion = Brand<string, "TemplateVersion">;
export type RouteId = Brand<string, "RouteId">;
export type PageTypeId = Brand<string, "PageTypeId">;
export type PageId = Brand<string, "PageId">;
export type NavigationDefinitionId = Brand<string, "NavigationDefinitionId">;
export type WidgetTypeId = Brand<string, "WidgetTypeId">;
export type BlockTypeId = Brand<string, "BlockTypeId">;
export type SectionTypeId = Brand<string, "SectionTypeId">;
export type ThemeDefinitionId = Brand<string, "ThemeDefinitionId">;
export type CapabilityId = Brand<string, "CapabilityId">;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

const definitionIdPattern = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)+$/;
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function definitionId<T extends string>(value: T): Brand<T, "DefinitionId"> {
  if (value.length < 3 || value.length > 160 || !definitionIdPattern.test(value)) {
    throw new TemplateContractError("SDK_INVALID_DEFINITION_ID", `Invalid definition id: ${value}`);
  }
  return value as Brand<T, "DefinitionId">;
}
export const ids = {
  template: (value: string) => {
    if (!/^[a-z0-9][a-z0-9.-]{2,159}$/.test(value))
      throw new TemplateContractError("SDK_INVALID_TEMPLATE_ID", "Invalid template id");
    return value as TemplateId;
  },
  version: (value: string) => {
    if (!semverPattern.test(value))
      throw new TemplateContractError("SDK_INVALID_SEMVER", "Invalid template version");
    return value as TemplateVersion;
  },
  route: (value: string) => definitionId(value) as unknown as RouteId,
  page: (value: string) => definitionId(value) as unknown as PageTypeId,
  navigation: (value: string) => definitionId(value) as unknown as NavigationDefinitionId,
  widget: (value: string) => definitionId(value) as unknown as WidgetTypeId,
  block: (value: string) => definitionId(value) as unknown as BlockTypeId,
  section: (value: string) => definitionId(value) as unknown as SectionTypeId,
  theme: (value: string) => definitionId(value) as unknown as ThemeDefinitionId,
  capability: (value: string) => definitionId(value) as unknown as CapabilityId,
};

export interface TemplateCompatibility {
  readonly sdkVersion: string;
  readonly minimumFactoryVersion: string;
  readonly maximumFactoryVersion?: string;
  readonly minimumRendererVersion: string;
  readonly contentSchemaVersion: number;
  readonly themeSchemaVersion: number;
  readonly publicationSnapshotVersion: number;
}

export interface TemplateManifestSource {
  readonly id: TemplateId;
  readonly version: TemplateVersion;
  readonly author: string;
  readonly description: string;
  readonly category: string;
  readonly displayName: string;
}

export interface EditorMetadata {
  readonly label: string;
  readonly description?: string;
  readonly control?:
    "text" | "textarea" | "number" | "boolean" | "select" | "media" | "url" | "group" | "list";
  readonly group?: string;
  readonly order?: number;
  readonly placeholder?: string;
  readonly aiHint?: string;
}
export interface FieldMetadataMap {
  readonly [jsonPointer: string]: EditorMetadata;
}
export interface SchemaIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}
export interface PortableSchema {
  readonly formatVersion: 1;
  readonly typeName: string;
  readonly description?: string;
  readonly fields: FieldMetadataMap;
}

export interface ContentSchema<T> {
  readonly version: number;
  readonly schema: z.ZodType<T>;
  readonly fields?: FieldMetadataMap;
  parse(input: unknown): T;
  safeParse(
    input: unknown,
  ): { success: true; value: T } | { success: false; issues: readonly SchemaIssue[] };
  toPortableSchema(): PortableSchema;
}

export function contentSchema<T>(options: {
  version: number;
  schema: z.ZodType<T>;
  fields?: FieldMetadataMap;
  description?: string;
}): ContentSchema<T> {
  assertPositiveVersion(options.version, "schema version");
  const fields = options.fields ?? {};
  return Object.freeze({
    version: options.version,
    schema: options.schema,
    fields,
    parse: (input: unknown) => options.schema.parse(input),
    safeParse: (input: unknown) => {
      const result = options.schema.safeParse(input);
      if (result.success) return { success: true as const, value: result.data };
      return {
        success: false as const,
        issues: result.error.issues.map((issue) => ({
          code: issue.code,
          path: `/${issue.path.map(String).join("/")}`,
          message: issue.message,
        })),
      };
    },
    toPortableSchema: () => ({
      formatVersion: 1 as const,
      typeName: options.schema.constructor.name,
      ...(options.description === undefined ? {} : { description: options.description }),
      fields,
    }),
  });
}

export interface CapabilityRequirement {
  readonly id: CapabilityId;
  readonly versionRange: string;
  readonly required: boolean;
}
export interface TemplateRenderContext {
  readonly locale: string;
  readonly pathname: string;
  readonly websiteName: string;
  readonly theme: Readonly<ThemeTokens>;
  readonly mediaUrl: (mediaId: string) => string;
  readonly linkUrl: (path: string) => string;
}
export type TemplateComponent<T> = (input: {
  readonly value: Readonly<T>;
  readonly context: TemplateRenderContext;
}) => ReactNode;
export interface ComponentDefinition<TId, TValue> {
  readonly id: TId;
  readonly title: string;
  readonly description?: string;
  readonly category?: string;
  readonly schema: ContentSchema<TValue>;
  readonly defaults: TValue;
  readonly capabilities?: readonly CapabilityRequirement[];
  readonly render: TemplateComponent<TValue>;
}
export type WidgetDefinition<T = JsonValue> = ComponentDefinition<WidgetTypeId, T>;
export type BlockDefinition<T = JsonValue> = ComponentDefinition<BlockTypeId, T>;
export type SectionDefinition<T = JsonValue> = ComponentDefinition<SectionTypeId, T>;

export interface SectionRequirement {
  readonly sectionTypeId: SectionTypeId;
  readonly minimum: number;
  readonly maximum?: number;
}
export interface DefaultSectionSpec {
  readonly sectionTypeId: SectionTypeId;
  readonly content?: JsonValue;
}
export interface PageDefinition {
  readonly id: PageTypeId;
  readonly title: string;
  readonly slug: { readonly kind: "fixed" | "editable"; readonly defaultValue?: string };
  readonly allowedSections: readonly SectionTypeId[];
  readonly requiredSections: readonly SectionRequirement[];
  readonly defaultSections: readonly DefaultSectionSpec[];
  readonly supportsSEO: boolean;
  readonly supportsNavigation: boolean;
  readonly supportsIndexing: boolean;
}
export interface NavigationDefinition {
  readonly id: NavigationDefinitionId;
  readonly title: string;
  readonly maximumDepth: number;
  readonly allowedPageTypes: readonly PageTypeId[] | "all";
  readonly ordering: "manual" | "page-order";
  readonly visibilitySchema: ContentSchema<JsonValue>;
  readonly localization: "shared" | "localized-labels" | "localized-tree";
  readonly allowedNodeKinds: readonly ("page" | "external" | "label")[];
}
export interface RouteDefinition {
  readonly id: RouteId;
  readonly pattern: string;
  readonly priority: number;
  readonly pageTypes: readonly PageTypeId[];
}

export interface ThemeTokens {
  readonly colors: Readonly<
    Record<
      | "background"
      | "surface"
      | "surfaceVariant"
      | "primary"
      | "primaryForeground"
      | "secondary"
      | "accent"
      | "success"
      | "warning"
      | "danger"
      | "info"
      | "border"
      | "muted"
      | "text"
      | "heading",
      string
    >
  >;
  readonly layout: {
    readonly radii: Readonly<Record<string, string>>;
    readonly shadows: Readonly<Record<string, string>>;
    readonly spacing: Readonly<Record<string, string>>;
    readonly containerWidths: Readonly<Record<string, string>>;
    readonly breakpoints: Readonly<Record<string, string>>;
  };
  readonly typography: {
    readonly fontFamilies: Readonly<Record<string, string>>;
    readonly fontSizes: Readonly<Record<string, string>>;
    readonly fontWeights: Readonly<Record<string, number>>;
    readonly lineHeights: Readonly<Record<string, number>>;
  };
  readonly motion: {
    readonly durations: Readonly<Record<string, string>>;
    readonly curves: Readonly<Record<string, string>>;
  };
}
export interface ThemeDefinition<T extends ThemeTokens = ThemeTokens> {
  readonly id: ThemeDefinitionId;
  readonly schemaVersion: number;
  readonly schema: ContentSchema<T>;
  readonly defaults: T;
}
export interface TemplateMigration {
  readonly id: string;
  readonly kind: "content" | "theme";
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(input: JsonValue): JsonValue;
}
export interface TemplateDefinition {
  readonly manifest: TemplateManifestSource;
  readonly compatibility: TemplateCompatibility;
  readonly websiteSchema: ContentSchema<JsonValue>;
  readonly theme: ThemeDefinition;
  readonly routes: readonly RouteDefinition[];
  readonly pages: readonly PageDefinition[];
  readonly navigation: readonly NavigationDefinition[];
  readonly widgets: readonly WidgetDefinition[];
  readonly blocks: readonly BlockDefinition[];
  readonly sections: readonly SectionDefinition[];
  readonly migrations: readonly TemplateMigration[];
}
export interface PortableTemplateManifest {
  readonly manifestFormatVersion: number;
  readonly manifest: TemplateManifestSource;
  readonly compatibility: TemplateCompatibility;
  readonly routes: readonly RouteDefinition[];
  readonly pages: readonly PageDefinition[];
  readonly navigation: readonly Omit<NavigationDefinition, "visibilitySchema">[];
  readonly components: readonly {
    id: WidgetTypeId | BlockTypeId | SectionTypeId;
    kind: "widget" | "block" | "section";
    title: string;
    schema: PortableSchema;
  }[];
  readonly theme: { id: ThemeDefinitionId; schemaVersion: number; schema: PortableSchema };
}

export class TemplateContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly path = "",
  ) {
    super(message);
    this.name = "TemplateContractError";
  }
}

export function defineTemplate<T extends TemplateDefinition>(template: T): Readonly<T> {
  validateCompatibility(template.compatibility);
  assertUniqueIds(template);
  assertReferences(template);
  return Object.freeze(template);
}

export function buildPortableManifest(template: TemplateDefinition): PortableTemplateManifest {
  return {
    manifestFormatVersion: TEMPLATE_MANIFEST_FORMAT_VERSION,
    manifest: template.manifest,
    compatibility: template.compatibility,
    routes: template.routes,
    pages: template.pages,
    navigation: template.navigation.map((item) => ({
      id: item.id,
      title: item.title,
      maximumDepth: item.maximumDepth,
      allowedPageTypes: item.allowedPageTypes,
      ordering: item.ordering,
      localization: item.localization,
      allowedNodeKinds: item.allowedNodeKinds,
    })),
    components: [
      ...template.widgets.map((item) => ({
        id: item.id,
        kind: "widget" as const,
        title: item.title,
        schema: item.schema.toPortableSchema(),
      })),
      ...template.blocks.map((item) => ({
        id: item.id,
        kind: "block" as const,
        title: item.title,
        schema: item.schema.toPortableSchema(),
      })),
      ...template.sections.map((item) => ({
        id: item.id,
        kind: "section" as const,
        title: item.title,
        schema: item.schema.toPortableSchema(),
      })),
    ],
    theme: {
      id: template.theme.id,
      schemaVersion: template.theme.schemaVersion,
      schema: template.theme.schema.toPortableSchema(),
    },
  };
}

function validateCompatibility(value: TemplateCompatibility): void {
  const versions = [
    value.sdkVersion,
    value.minimumFactoryVersion,
    value.minimumRendererVersion,
    ...(value.maximumFactoryVersion === undefined ? [] : [value.maximumFactoryVersion]),
  ];
  if (versions.some((version) => !semverPattern.test(version)))
    throw new TemplateContractError(
      "SDK_INVALID_SEMVER",
      "Compatibility versions must be semantic versions",
    );
  assertPositiveVersion(value.contentSchemaVersion, "contentSchemaVersion");
  assertPositiveVersion(value.themeSchemaVersion, "themeSchemaVersion");
  assertPositiveVersion(value.publicationSnapshotVersion, "publicationSnapshotVersion");
}
function assertPositiveVersion(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1)
    throw new TemplateContractError("SDK_INVALID_VERSION", `${name} must be a positive integer`);
}
function assertUniqueIds(template: TemplateDefinition): void {
  const ids = [
    template.manifest.id,
    template.theme.id,
    ...template.routes.map((x) => x.id),
    ...template.pages.map((x) => x.id),
    ...template.navigation.map((x) => x.id),
    ...template.widgets.map((x) => x.id),
    ...template.blocks.map((x) => x.id),
    ...template.sections.map((x) => x.id),
  ];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id))
      throw new TemplateContractError("SDK_DUPLICATE_ID", `Duplicate definition id: ${id}`);
    seen.add(id);
  }
}
function assertReferences(template: TemplateDefinition): void {
  const pages = new Set<string>(template.pages.map((x) => x.id));
  const sections = new Set<string>(template.sections.map((x) => x.id));
  for (const route of template.routes)
    for (const id of route.pageTypes)
      if (!pages.has(id))
        throw new TemplateContractError("SDK_UNKNOWN_PAGE", `Route references unknown page: ${id}`);
  for (const page of template.pages) {
    for (const id of page.allowedSections)
      if (!sections.has(id))
        throw new TemplateContractError(
          "SDK_UNKNOWN_SECTION",
          `Page references unknown section: ${id}`,
        );
    for (const item of page.requiredSections)
      if (!page.allowedSections.includes(item.sectionTypeId))
        throw new TemplateContractError(
          "SDK_REQUIRED_NOT_ALLOWED",
          `Required section is not allowed: ${item.sectionTypeId}`,
        );
    for (const item of page.defaultSections)
      if (!page.allowedSections.includes(item.sectionTypeId))
        throw new TemplateContractError(
          "SDK_DEFAULT_NOT_ALLOWED",
          `Default section is not allowed: ${item.sectionTypeId}`,
        );
  }
}
