import type { ReactNode } from "react";
import { z } from "zod";
import { TEMPLATE_MANIFEST_FORMAT_VERSION } from "./version";

export { TEMPLATE_MANIFEST_FORMAT_VERSION, TEMPLATE_SDK_VERSION } from "./version";
export { z };

export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type TemplateId = Brand<string, "TemplateId">;
export type TemplateVersion = Brand<string, "TemplateVersion">;
export type TemplateArtifactId = Brand<string, "TemplateArtifactId">;
export type RouteId = Brand<string, "RouteId">;
export type PageTypeId = Brand<string, "PageTypeId">;
export type PageId = Brand<string, "PageId">;
export type NavigationDefinitionId = Brand<string, "NavigationDefinitionId">;
export type NavigationId = Brand<string, "NavigationId">;
export type NavigationNodeId = Brand<string, "NavigationNodeId">;
export type WidgetTypeId = Brand<string, "WidgetTypeId">;
export type WidgetId = Brand<string, "WidgetId">;
export type BlockTypeId = Brand<string, "BlockTypeId">;
export type BlockId = Brand<string, "BlockId">;
export type SectionTypeId = Brand<string, "SectionTypeId">;
export type SectionId = Brand<string, "SectionId">;
export type ThemeDefinitionId = Brand<string, "ThemeDefinitionId">;
export type ThemeId = Brand<string, "ThemeId">;
export type MigrationId = Brand<string, "MigrationId">;
export type CapabilityId = Brand<string, "CapabilityId">;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

const definitionIdPattern = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)+$/;
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const semverRangePattern = /^(?:[~^]|>=?|<=?)?\d+\.\d+\.\d+(?:\s+-\s+\d+\.\d+\.\d+)?$/;
const reservedRoutePrefixes = ["/_preview", "/api", "/_next"];

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

export function definitionId<T extends string>(value: T): Brand<T, "DefinitionId"> {
  if (value.length < 3 || value.length > 160 || !definitionIdPattern.test(value)) {
    throw new TemplateContractError("SDK_INVALID_DEFINITION_ID", `Invalid definition id: ${value}`);
  }
  return value as Brand<T, "DefinitionId">;
}

function instanceId<TName extends string>(value: string, name: TName): Brand<string, TName> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new TemplateContractError("SDK_INVALID_INSTANCE_ID", `Invalid ${name}: ${value}`);
  }
  return value as Brand<string, TName>;
}

export const ids = {
  template: (value: string) => {
    if (!/^[a-z0-9][a-z0-9.-]{2,159}$/.test(value)) {
      throw new TemplateContractError("SDK_INVALID_TEMPLATE_ID", "Invalid template id");
    }
    return value as TemplateId;
  },
  version: (value: string) => {
    if (!semverPattern.test(value)) {
      throw new TemplateContractError("SDK_INVALID_SEMVER", "Invalid template version");
    }
    return value as TemplateVersion;
  },
  artifact: (value: string) => definitionId(value) as unknown as TemplateArtifactId,
  route: (value: string) => definitionId(value) as unknown as RouteId,
  page: (value: string) => definitionId(value) as unknown as PageTypeId,
  pageInstance: (value: string) => instanceId(value, "PageId") as PageId,
  navigation: (value: string) => definitionId(value) as unknown as NavigationDefinitionId,
  navigationInstance: (value: string) => instanceId(value, "NavigationId") as NavigationId,
  navigationNode: (value: string) => instanceId(value, "NavigationNodeId") as NavigationNodeId,
  widget: (value: string) => definitionId(value) as unknown as WidgetTypeId,
  widgetInstance: (value: string) => instanceId(value, "WidgetId") as WidgetId,
  block: (value: string) => definitionId(value) as unknown as BlockTypeId,
  blockInstance: (value: string) => instanceId(value, "BlockId") as BlockId,
  section: (value: string) => definitionId(value) as unknown as SectionTypeId,
  sectionInstance: (value: string) => instanceId(value, "SectionId") as SectionId,
  theme: (value: string) => definitionId(value) as unknown as ThemeDefinitionId,
  themeInstance: (value: string) => instanceId(value, "ThemeId") as ThemeId,
  migration: (value: string) => definitionId(value) as unknown as MigrationId,
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
  readonly previewImage?: string;
  readonly features?: readonly string[];
}

export type EditorControlId =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "media"
  | "reference"
  | "url"
  | "color"
  | "group"
  | "list"
  | "document-import";

export interface PortableCondition {
  readonly path: string;
  readonly operator: "equals" | "not-equals" | "present" | "absent";
  readonly value?: JsonPrimitive;
}

export interface EditorMetadata {
  readonly label: string;
  readonly description?: string;
  readonly help?: string;
  readonly control?: EditorControlId;
  readonly group?: string;
  readonly order?: number;
  readonly placeholder?: string;
  readonly options?: readonly { readonly label: string; readonly value: JsonPrimitive }[];
  readonly localization?: "none" | "value" | "document";
  readonly referenceKind?: string;
  readonly mediaKinds?: readonly string[];
  readonly visibleWhen?: PortableCondition;
  readonly readOnlyWhen?: PortableCondition;
  readonly aiHint?: string;
  readonly sensitive?: boolean;
  readonly since?: string;
  readonly deprecated?: boolean;
}

export interface FieldMetadataMap {
  readonly [jsonPointer: string]: EditorMetadata;
}

export interface SchemaIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: "error";
  readonly expected?: JsonPrimitive;
}

export interface PortableSchema {
  readonly formatVersion: 1;
  readonly typeName: string;
  readonly description?: string;
  readonly jsonSchema: JsonValue;
  readonly schemaHash: string;
  readonly fields: FieldMetadataMap;
}

export interface ContentSchema<T> {
  readonly version: number;
  readonly schema: z.ZodType<T>;
  readonly fields: FieldMetadataMap;
  parse(input: unknown): T;
  safeParse(
    input: unknown,
  ):
    | { success: true; value: T; issues: readonly [] }
    | { success: false; issues: readonly SchemaIssue[] };
  toPortableSchema(): PortableSchema;
  describe(): {
    readonly version: number;
    readonly description?: string;
    readonly fields: FieldMetadataMap;
  };
}

export function contentSchema<T>(options: {
  version: number;
  schema: z.ZodType<T>;
  fields?: FieldMetadataMap;
  description?: string;
}): ContentSchema<T> {
  assertPositiveVersion(options.version, "schema version");
  const fields = Object.freeze({ ...(options.fields ?? {}) });
  let portable: PortableSchema | undefined;
  const toPortableSchema = (): PortableSchema => {
    if (portable) return portable;
    let jsonSchema: JsonValue;
    try {
      jsonSchema = assertJsonValue(
        z.toJSONSchema(options.schema, {
          target: "draft-2020-12",
          unrepresentable: "throw",
          cycles: "throw",
          reused: "inline",
          io: "input",
        }),
      );
    } catch (error) {
      throw new TemplateContractError(
        "SDK_SCHEMA_NOT_PORTABLE",
        error instanceof Error ? error.message : "Schema cannot be represented portably",
      );
    }
    enforcePortableBounds(jsonSchema);
    portable = deepFreeze({
      formatVersion: 1 as const,
      typeName: options.schema.constructor.name,
      ...(options.description === undefined ? {} : { description: options.description }),
      jsonSchema,
      schemaHash: stableHash(canonicalize(jsonSchema)),
      fields,
    });
    return portable;
  };
  return deepFreeze({
    version: options.version,
    schema: options.schema,
    fields,
    parse: (input: unknown) => options.schema.parse(input),
    safeParse: (input: unknown) => {
      const result = options.schema.safeParse(input);
      if (result.success)
        return { success: true as const, value: result.data, issues: [] as const };
      return {
        success: false as const,
        issues: result.error.issues.map((issue) => ({
          code: issue.code,
          path: `/${issue.path.map(escapeJsonPointer).join("/")}`,
          message: issue.message,
          severity: "error" as const,
        })),
      };
    },
    toPortableSchema,
    describe: () => ({
      version: options.version,
      ...(options.description === undefined ? {} : { description: options.description }),
      fields,
    }),
  });
}

export interface CapabilityRequirement {
  readonly id: CapabilityId;
  readonly versionRange: string;
  readonly required: boolean;
  readonly configurationSchema?: PortableSchema;
}

export interface PublicRequestContext {
  readonly pathname: string;
  readonly search: Readonly<Record<string, readonly string[]>>;
  readonly variantFlags: Readonly<Record<string, string>>;
}

export interface PublicWebsiteContext {
  readonly id: string;
  readonly name: string;
  readonly defaultLocale: string;
  readonly settings: JsonValue;
}

export interface MediaCapability {
  url(mediaId: string, variant?: string): string;
}

export interface LinkCapability {
  url(path: string): string;
}

export interface CapabilityGateway {
  available(id: CapabilityId, versionRange: string): boolean;
}

export interface TemplateRenderContext {
  readonly request: PublicRequestContext;
  readonly website: PublicWebsiteContext;
  readonly locale: string;
  readonly theme: Readonly<ThemeTokens>;
  readonly navigation: Readonly<Record<string, JsonValue>>;
  readonly media: MediaCapability;
  readonly links: LinkCapability;
  readonly features: CapabilityGateway;
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
  readonly editor?: Readonly<{ readonly group?: string; readonly icon?: string }>;
  readonly capabilities?: readonly CapabilityRequirement[];
  readonly composedOf?: readonly (WidgetTypeId | BlockTypeId)[];
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
  readonly slug: {
    readonly kind: "fixed" | "editable";
    readonly defaultValue?: string;
    readonly maximumLength?: number;
  };
  readonly allowedSections: readonly SectionTypeId[];
  readonly requiredSections: readonly SectionRequirement[];
  readonly defaultSections: readonly DefaultSectionSpec[];
  readonly supportsSEO: boolean;
  readonly supportsNavigation: boolean;
  readonly supportsIndexing: boolean;
  readonly editor?: Readonly<{ readonly description?: string; readonly icon?: string }>;
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
  readonly editor?: Readonly<{ readonly description?: string }>;
}

export interface RouteDefinition {
  readonly id: RouteId;
  readonly pattern: string;
  readonly priority: number;
  readonly pageTypes: readonly PageTypeId[];
  readonly localePolicy: "default" | "prefix" | "prefix-except-default";
  readonly indexingPolicy: "inherit-page" | "index" | "noindex";
}

export interface SeoDocument {
  readonly title?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly canonicalPath?: string;
  readonly robots?: { readonly index: boolean; readonly follow: boolean };
  readonly openGraph?: Readonly<Record<string, JsonValue>>;
  readonly twitter?: Readonly<Record<string, JsonValue>>;
  readonly structuredData?: readonly Readonly<Record<string, JsonValue>>[];
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
  readonly editor?: Readonly<{ readonly groups?: readonly string[] }>;
}

export interface TemplateMigration {
  readonly id: MigrationId;
  readonly kind: "content" | "theme";
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(input: JsonValue, context: { readonly locale: string }): JsonValue;
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
  readonly capabilities?: readonly CapabilityRequirement[];
  readonly migrations: readonly TemplateMigration[];
}

export interface PortableTemplateManifest {
  readonly manifestFormatVersion: number;
  readonly manifestHash: string;
  readonly manifest: TemplateManifestSource;
  readonly compatibility: TemplateCompatibility;
  readonly websiteSchema: PortableSchema;
  readonly capabilities: readonly CapabilityRequirement[];
  readonly routes: readonly RouteDefinition[];
  readonly pages: readonly PageDefinition[];
  readonly navigation: readonly Omit<NavigationDefinition, "visibilitySchema">[];
  readonly components: readonly {
    readonly id: WidgetTypeId | BlockTypeId | SectionTypeId;
    readonly kind: "widget" | "block" | "section";
    readonly title: string;
    readonly description?: string;
    readonly category?: string;
    readonly schema: PortableSchema;
    readonly composedOf: readonly (WidgetTypeId | BlockTypeId)[];
    readonly capabilities: readonly CapabilityRequirement[];
  }[];
  readonly theme: {
    readonly id: ThemeDefinitionId;
    readonly schemaVersion: number;
    readonly schema: PortableSchema;
  };
  readonly migrations: readonly {
    readonly id: MigrationId;
    readonly kind: "content" | "theme";
    readonly fromVersion: number;
    readonly toVersion: number;
  }[];
}

export function defineTemplate<T extends TemplateDefinition>(template: T): Readonly<T> {
  validateCompatibility(template.compatibility);
  assertNonEmpty(template.manifest.displayName, "manifest.displayName");
  assertNonEmpty(template.manifest.author, "manifest.author");
  assertNonEmpty(template.manifest.description, "manifest.description");
  assertUniqueIds(template);
  assertReferences(template);
  assertRoutes(template.routes);
  assertComponentDefaults(template);
  assertMigrations(template.migrations);
  assertCapabilities(template);
  template.websiteSchema.toPortableSchema();
  template.theme.schema.toPortableSchema();
  for (const component of [...template.widgets, ...template.blocks, ...template.sections]) {
    component.schema.toPortableSchema();
  }
  return deepFreeze(template);
}

export function buildPortableManifest(template: TemplateDefinition): PortableTemplateManifest {
  const base = {
    manifestFormatVersion: TEMPLATE_MANIFEST_FORMAT_VERSION,
    manifest: template.manifest,
    compatibility: template.compatibility,
    websiteSchema: template.websiteSchema.toPortableSchema(),
    capabilities: template.capabilities ?? [],
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
      ...(item.editor === undefined ? {} : { editor: item.editor }),
    })),
    components: [
      ...template.widgets.map((item) => portableComponent(item, "widget")),
      ...template.blocks.map((item) => portableComponent(item, "block")),
      ...template.sections.map((item) => portableComponent(item, "section")),
    ],
    theme: {
      id: template.theme.id,
      schemaVersion: template.theme.schemaVersion,
      schema: template.theme.schema.toPortableSchema(),
    },
    migrations: template.migrations.map(({ id, kind, fromVersion, toVersion }) => ({
      id,
      kind,
      fromVersion,
      toVersion,
    })),
  };
  const manifestHash = stableHash(canonicalize(assertJsonValue(base)));
  return deepFreeze({ ...base, manifestHash });
}

function portableComponent(
  item: WidgetDefinition | BlockDefinition | SectionDefinition,
  kind: "widget" | "block" | "section",
) {
  return {
    id: item.id,
    kind,
    title: item.title,
    ...(item.description === undefined ? {} : { description: item.description }),
    ...(item.category === undefined ? {} : { category: item.category }),
    schema: item.schema.toPortableSchema(),
    composedOf: item.composedOf ?? [],
    capabilities: item.capabilities ?? [],
  };
}

function validateCompatibility(value: TemplateCompatibility): void {
  const versions = [
    value.sdkVersion,
    value.minimumFactoryVersion,
    value.minimumRendererVersion,
    ...(value.maximumFactoryVersion === undefined ? [] : [value.maximumFactoryVersion]),
  ];
  if (versions.some((version) => !semverPattern.test(version))) {
    throw new TemplateContractError(
      "SDK_INVALID_SEMVER",
      "Compatibility versions must be semantic versions",
    );
  }
  assertPositiveVersion(value.contentSchemaVersion, "contentSchemaVersion");
  assertPositiveVersion(value.themeSchemaVersion, "themeSchemaVersion");
  assertPositiveVersion(value.publicationSnapshotVersion, "publicationSnapshotVersion");
}

function assertPositiveVersion(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new TemplateContractError("SDK_INVALID_VERSION", `${name} must be a positive integer`);
  }
}

function assertNonEmpty(value: string, path: string): void {
  if (!value.trim())
    throw new TemplateContractError("SDK_REQUIRED_VALUE", `${path} is required`, path);
}

function assertUniqueIds(template: TemplateDefinition): void {
  const allIds = [
    template.manifest.id,
    template.theme.id,
    ...template.routes.map((item) => item.id),
    ...template.pages.map((item) => item.id),
    ...template.navigation.map((item) => item.id),
    ...template.widgets.map((item) => item.id),
    ...template.blocks.map((item) => item.id),
    ...template.sections.map((item) => item.id),
    ...template.migrations.map((item) => item.id),
  ];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) {
      throw new TemplateContractError("SDK_DUPLICATE_ID", `Duplicate definition id: ${id}`);
    }
    seen.add(id);
  }
}

function assertReferences(template: TemplateDefinition): void {
  const pages = new Set<string>(template.pages.map((item) => item.id));
  const sections = new Map<string, SectionDefinition>(
    template.sections.map((item) => [item.id as string, item]),
  );
  const composable = new Set<string>([
    ...template.widgets.map((item) => item.id),
    ...template.blocks.map((item) => item.id),
  ]);
  for (const route of template.routes) {
    if (!route.pageTypes.length) {
      throw new TemplateContractError(
        "SDK_ROUTE_WITHOUT_PAGE",
        `Route has no page types: ${route.id}`,
      );
    }
    for (const id of route.pageTypes) {
      if (!pages.has(id)) {
        throw new TemplateContractError("SDK_UNKNOWN_PAGE", `Route references unknown page: ${id}`);
      }
    }
  }
  for (const navigation of template.navigation) {
    if (
      !Number.isInteger(navigation.maximumDepth) ||
      navigation.maximumDepth < 1 ||
      navigation.maximumDepth > 8
    ) {
      throw new TemplateContractError(
        "SDK_INVALID_NAVIGATION_DEPTH",
        `Navigation maximum depth must be between 1 and 8: ${navigation.id}`,
      );
    }
    if (navigation.allowedPageTypes !== "all") {
      for (const id of navigation.allowedPageTypes) {
        if (!pages.has(id)) {
          throw new TemplateContractError(
            "SDK_UNKNOWN_PAGE",
            `Navigation references unknown page: ${id}`,
          );
        }
      }
    }
  }
  for (const page of template.pages) {
    const allowed = new Set<string>(page.allowedSections);
    for (const id of allowed) {
      if (!sections.has(id)) {
        throw new TemplateContractError(
          "SDK_UNKNOWN_SECTION",
          `Page references unknown section: ${id}`,
        );
      }
    }
    for (const requirement of page.requiredSections) {
      if (!allowed.has(requirement.sectionTypeId)) {
        throw new TemplateContractError(
          "SDK_REQUIRED_NOT_ALLOWED",
          `Required section is not allowed: ${requirement.sectionTypeId}`,
        );
      }
      if (
        !Number.isInteger(requirement.minimum) ||
        requirement.minimum < 0 ||
        (requirement.maximum !== undefined &&
          (!Number.isInteger(requirement.maximum) || requirement.maximum < requirement.minimum))
      ) {
        throw new TemplateContractError(
          "SDK_INVALID_MULTIPLICITY",
          `Invalid section multiplicity: ${requirement.sectionTypeId}`,
        );
      }
    }
    const defaultCounts = new Map<string, number>();
    for (const item of page.defaultSections) {
      const section = sections.get(item.sectionTypeId);
      if (!allowed.has(item.sectionTypeId) || !section) {
        throw new TemplateContractError(
          "SDK_DEFAULT_NOT_ALLOWED",
          `Default section is not allowed: ${item.sectionTypeId}`,
        );
      }
      const result = section.schema.safeParse(item.content ?? section.defaults);
      if (!result.success) {
        throw new TemplateContractError(
          "SDK_INVALID_DEFAULT",
          `Default section content is invalid: ${item.sectionTypeId}`,
        );
      }
      defaultCounts.set(item.sectionTypeId, (defaultCounts.get(item.sectionTypeId) ?? 0) + 1);
    }
    for (const requirement of page.requiredSections) {
      const count = defaultCounts.get(requirement.sectionTypeId) ?? 0;
      if (
        count < requirement.minimum ||
        (requirement.maximum !== undefined && count > requirement.maximum)
      ) {
        throw new TemplateContractError(
          "SDK_UNSATISFIABLE_DEFAULTS",
          `Page defaults do not satisfy ${requirement.sectionTypeId}`,
        );
      }
    }
  }
  for (const component of [...template.blocks, ...template.sections]) {
    for (const id of component.composedOf ?? []) {
      if (!composable.has(id)) {
        throw new TemplateContractError(
          "SDK_UNKNOWN_COMPOSED_COMPONENT",
          `${component.id} composes unknown component ${id}`,
        );
      }
      if (id === component.id) {
        throw new TemplateContractError("SDK_COMPOSITION_CYCLE", `${component.id} composes itself`);
      }
    }
  }
}

function assertRoutes(routes: readonly RouteDefinition[]): void {
  const normalized = new Map<string, RouteDefinition>();
  for (const route of routes) {
    if (!Number.isInteger(route.priority)) {
      throw new TemplateContractError(
        "SDK_INVALID_ROUTE_PRIORITY",
        `Invalid priority: ${route.id}`,
      );
    }
    if (
      !route.pattern.startsWith("/") ||
      route.pattern.includes("//") ||
      route.pattern.includes("..")
    ) {
      throw new TemplateContractError(
        "SDK_INVALID_ROUTE",
        `Invalid route pattern: ${route.pattern}`,
      );
    }
    if (
      reservedRoutePrefixes.some(
        (prefix) => route.pattern === prefix || route.pattern.startsWith(`${prefix}/`),
      )
    ) {
      throw new TemplateContractError(
        "SDK_RESERVED_ROUTE",
        `Reserved route pattern: ${route.pattern}`,
      );
    }
    if (
      !/^\/(?:[a-z0-9._~-]+|:[a-z][a-z0-9]*(?:\?)?|\*[a-z][a-z0-9]*)(?:\/(?:[a-z0-9._~-]+|:[a-z][a-z0-9]*(?:\?)?|\*[a-z][a-z0-9]*))*\/?$/i.test(
        route.pattern,
      )
    ) {
      throw new TemplateContractError(
        "SDK_INVALID_ROUTE",
        `Unsupported route pattern: ${route.pattern}`,
      );
    }
    const shape = route.pattern
      .replace(/:[a-z][a-z0-9]*\??/gi, ":param")
      .replace(/\*[a-z][a-z0-9]*/gi, "*catchall");
    const existing = normalized.get(shape);
    if (existing && existing.priority === route.priority) {
      throw new TemplateContractError(
        "SDK_AMBIGUOUS_ROUTE",
        `Ambiguous route patterns: ${existing.pattern} and ${route.pattern}`,
      );
    }
    normalized.set(shape, route);
  }
}

function assertComponentDefaults(template: TemplateDefinition): void {
  for (const component of [...template.widgets, ...template.blocks, ...template.sections]) {
    if (!component.schema.safeParse(component.defaults).success) {
      throw new TemplateContractError(
        "SDK_INVALID_DEFAULT",
        `Invalid defaults for ${component.id}`,
      );
    }
    for (const capability of component.capabilities ?? []) validateCapability(capability);
  }
  if (!template.theme.schema.safeParse(template.theme.defaults).success) {
    throw new TemplateContractError("SDK_INVALID_THEME_DEFAULT", "Theme defaults do not validate");
  }
}

function assertCapabilities(template: TemplateDefinition): void {
  const seen = new Set<string>();
  for (const capability of template.capabilities ?? []) {
    validateCapability(capability);
    if (seen.has(capability.id)) {
      throw new TemplateContractError(
        "SDK_DUPLICATE_CAPABILITY",
        `Duplicate capability: ${capability.id}`,
      );
    }
    seen.add(capability.id);
  }
}

function validateCapability(capability: CapabilityRequirement): void {
  definitionId(capability.id);
  if (!semverRangePattern.test(capability.versionRange)) {
    throw new TemplateContractError(
      "SDK_INVALID_CAPABILITY_RANGE",
      `Invalid capability range: ${capability.versionRange}`,
    );
  }
}

function assertMigrations(migrations: readonly TemplateMigration[]): void {
  const edges = new Set<string>();
  for (const migration of migrations) {
    assertPositiveVersion(migration.fromVersion, `${migration.id}.fromVersion`);
    assertPositiveVersion(migration.toVersion, `${migration.id}.toVersion`);
    if (migration.toVersion <= migration.fromVersion) {
      throw new TemplateContractError(
        "SDK_INVALID_MIGRATION_EDGE",
        `Migration must advance: ${migration.id}`,
      );
    }
    const edge = `${migration.kind}:${migration.fromVersion}:${migration.toVersion}`;
    if (edges.has(edge)) {
      throw new TemplateContractError(
        "SDK_AMBIGUOUS_MIGRATION",
        `Duplicate migration edge: ${edge}`,
      );
    }
    edges.add(edge);
  }
}

function enforcePortableBounds(value: JsonValue): void {
  const serialized = canonicalize(value);
  if (serialized.length > 256_000) {
    throw new TemplateContractError("SDK_SCHEMA_TOO_LARGE", "Portable schema exceeds 256KB");
  }
  const visit = (node: JsonValue, depth: number): void => {
    if (depth > 32)
      throw new TemplateContractError("SDK_SCHEMA_TOO_DEEP", "Portable schema is too deep");
    if (Array.isArray(node)) {
      if (node.length > 256)
        throw new TemplateContractError("SDK_SCHEMA_TOO_WIDE", "Schema array is too large");
      node.forEach((item) => visit(item, depth + 1));
    } else if (node !== null && typeof node === "object") {
      const entries = Object.entries(node);
      if (entries.length > 256) {
        throw new TemplateContractError("SDK_SCHEMA_TOO_WIDE", "Schema object is too large");
      }
      entries.forEach(([, item]) => visit(item, depth + 1));
    }
  };
  visit(value, 0);
}

function assertJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(assertJsonValue);
  if (typeof value === "object") {
    const result: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined || typeof child === "function" || typeof child === "symbol") {
        throw new TemplateContractError("SDK_NON_PORTABLE_VALUE", `Non-portable value at ${key}`);
      }
      result[key] = assertJsonValue(child);
    }
    return result;
  }
  throw new TemplateContractError("SDK_NON_PORTABLE_VALUE", "Value is not JSON-compatible");
}

function canonicalize(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key] as JsonValue)}`)
    .join(",")}}`;
}

function stableHash(value: string): string {
  let first = 0xcbf29ce484222325n;
  let second = 0x84222325cbf29ce4n;
  for (const byte of new TextEncoder().encode(value)) {
    first = BigInt.asUintN(64, (first ^ BigInt(byte)) * 0x100000001b3n);
    second = BigInt.asUintN(64, (second ^ BigInt(byte + 31)) * 0x100000001b3n);
  }
  return `${first.toString(16).padStart(16, "0")}${second.toString(16).padStart(16, "0")}`;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (Array.isArray(value) || prototype === Object.prototype || prototype === null) {
      Object.freeze(value);
      for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    }
  }
  return value;
}

function escapeJsonPointer(value: PropertyKey): string {
  return String(value).replace(/~/g, "~0").replace(/\//g, "~1");
}
