import {
  buildPortableManifest,
  type JsonValue,
  type TemplateDefinition,
  type ThemeTokens,
} from "@factory/template-sdk";
import {
  PUBLICATION_SNAPSHOT_VERSION,
  sealSnapshot,
  seoDocumentSchema,
  snapshotHash,
  type PublicationSnapshot,
} from "@factory/publication-contract";

export interface DraftProjection {
  readonly organizationId: string;
  readonly websiteId: string;
  readonly publicationId: string;
  readonly revision: bigint;
  readonly name: string;
  readonly defaultLocale: string;
  readonly settingsSchemaVersion?: number;
  readonly settings: JsonValue;
  readonly locales: readonly { readonly locale: string; readonly fallbackLocale: string | null }[];
  readonly pages: readonly {
    readonly id: string;
    readonly pageTypeId: string;
    readonly locale: string;
    readonly title: string;
    readonly slug: string;
    readonly seo: JsonValue | null;
    readonly sections: readonly {
      readonly id: string;
      readonly sectionTypeId: string;
      readonly schemaVersion: number;
      readonly content: JsonValue;
      readonly visibility?: JsonValue | null;
      readonly orderKey: string;
    }[];
  }[];
  readonly navigation: readonly {
    readonly definitionId: string;
    readonly locale: string | null;
    readonly schemaVersion?: number;
    readonly nodes: readonly JsonValue[];
  }[];
  readonly theme: ThemeTokens;
  readonly media: readonly {
    readonly id: string;
    readonly url: string;
    readonly contentHash?: string | null;
    readonly variants: Readonly<Record<string, string>>;
  }[];
  readonly capabilities?: Readonly<Record<string, JsonValue>>;
}

export interface CompilationDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export type CompilationResult =
  | { readonly success: true; readonly snapshot: PublicationSnapshot; readonly hash: string }
  | { readonly success: false; readonly diagnostics: readonly CompilationDiagnostic[] };

export function createDefaultTemplateDraft(
  template: TemplateDefinition,
  artifactHash: string,
  locale = "en",
): DraftProjection {
  const identity = artifactHash.slice(0, 16);
  const pageIds = new Map(
    template.pages.map((page, index) => [page.id as string, `page-${identity}-${index}`]),
  );
  return {
    organizationId: `catalog-${identity}`,
    websiteId: `website-${identity}`,
    publicationId: `preview-${identity}`,
    revision: 1n,
    name: template.manifest.displayName,
    defaultLocale: locale,
    settingsSchemaVersion: template.websiteSchema.version,
    settings: template.websiteSchema.parse({}),
    locales: [{ locale, fallbackLocale: null }],
    pages: template.pages.map((page, pageIndex) => ({
      id: pageIds.get(page.id)!,
      pageTypeId: page.id,
      locale,
      title: page.title,
      slug: page.slug.defaultValue ?? (pageIndex === 0 ? "/" : defaultSlug(page.title)),
      seo: { title: page.title, description: template.manifest.description },
      sections: page.defaultSections.flatMap((section, sectionIndex) => {
        const definition = template.sections.find((item) => item.id === section.sectionTypeId);
        return definition
          ? [
              {
                id: `section-${identity}-${pageIndex}-${sectionIndex}`,
                sectionTypeId: definition.id,
                schemaVersion: definition.schema.version,
                content: section.content ?? definition.defaults,
                orderKey: String(sectionIndex).padStart(4, "0"),
              },
            ]
          : [];
      }),
    })),
    navigation: template.navigation.map((definition) => ({
      definitionId: definition.id,
      locale: definition.localization === "localized-tree" ? locale : null,
      schemaVersion: definition.visibilitySchema.version,
      nodes: template.pages.flatMap((page, index) => {
        const pageId = pageIds.get(page.id);
        const allowed =
          definition.allowedPageTypes === "all" || definition.allowedPageTypes.includes(page.id);
        return pageId && allowed
          ? [
              {
                id: `nav-${identity}-${String(definition.id).replace(/[^a-z0-9]/gi, "-")}-${index}`,
                kind: "page",
                pageId,
                label: { [locale]: page.title },
                visibility: definition.visibilitySchema.parse({}),
                children: [],
              },
            ]
          : [];
      }),
    })),
    theme: template.theme.defaults,
    media: [],
  };
}

export function compilePublication(
  draft: DraftProjection,
  template: TemplateDefinition,
  artifactHash: string,
  manifestHash = buildPortableManifest(template).manifestHash,
): CompilationResult {
  const diagnostics: CompilationDiagnostic[] = [];
  const report = (code: string, path: string, message: string) => {
    diagnostics.push({ code, path, message });
  };

  if (!/^[0-9a-f]{64}$/.test(artifactHash)) {
    report(
      "COMPILER_INVALID_ARTIFACT_HASH",
      "/template/artifactHash",
      "Artifact hash must be SHA-256",
    );
  }
  if (template.compatibility.publicationSnapshotVersion !== PUBLICATION_SNAPSHOT_VERSION) {
    report(
      "COMPILER_SNAPSHOT_VERSION_INCOMPATIBLE",
      "/template/compatibility/publicationSnapshotVersion",
      "Template snapshot version is unsupported",
    );
  }
  if (draft.revision < 1n) {
    report("COMPILER_INVALID_REVISION", "/revision", "Draft revision must be positive");
  }

  const settings = template.websiteSchema.safeParse(draft.settings);
  if (!settings.success) {
    diagnostics.push(
      ...settings.issues.map((issue) => ({
        code: "COMPILER_INVALID_WEBSITE_SETTINGS",
        path: `/settings${issue.path}`,
        message: issue.message,
      })),
    );
  }
  if (
    draft.settingsSchemaVersion !== undefined &&
    draft.settingsSchemaVersion !== template.websiteSchema.version
  ) {
    report(
      "COMPILER_SETTINGS_SCHEMA_VERSION",
      "/settingsSchemaVersion",
      "Website settings schema version does not match the template",
    );
  }

  validateLocales(draft, report);
  const pageTypes = new Map(template.pages.map((item) => [item.id as string, item]));
  const sectionTypes = new Map(template.sections.map((item) => [item.id as string, item]));
  const pageIds = new Set<string>();
  const pageTypeById = new Map<string, string>();
  const routeKeys = new Set<string>();
  const compiledRoutes: {
    routeId: string;
    pathname: string;
    pageId: string;
    locale: string;
    indexingPolicy: "index" | "noindex";
  }[] = [];

  for (const [pageIndex, page] of draft.pages.entries()) {
    const pagePath = `/pages/${pageIndex}`;
    if (pageIds.has(page.id))
      report("COMPILER_DUPLICATE_PAGE_ID", `${pagePath}/id`, "Duplicate page id");
    pageIds.add(page.id);
    pageTypeById.set(page.id, page.pageTypeId);
    const definition = pageTypes.get(page.pageTypeId);
    if (!definition) {
      report("COMPILER_UNKNOWN_PAGE_TYPE", `${pagePath}/pageTypeId`, "Unknown page type");
      continue;
    }
    if (!draft.locales.some((item) => item.locale === page.locale)) {
      report("COMPILER_UNKNOWN_PAGE_LOCALE", `${pagePath}/locale`, "Page locale is not configured");
    }
    if (!page.title.trim() || page.title.length > 200) {
      report("COMPILER_INVALID_PAGE_TITLE", `${pagePath}/title`, "Page title is invalid");
    }
    const slug = normalizeSlug(page.slug);
    if (slug === null) report("COMPILER_INVALID_SLUG", `${pagePath}/slug`, "Page slug is invalid");
    if (
      definition.slug.kind === "fixed" &&
      definition.slug.defaultValue !== undefined &&
      normalizeSlug(definition.slug.defaultValue) !== slug
    ) {
      report("COMPILER_FIXED_SLUG_MISMATCH", `${pagePath}/slug`, "Page must use its fixed slug");
    }
    if (
      definition.slug.maximumLength !== undefined &&
      page.slug.length > definition.slug.maximumLength
    ) {
      report("COMPILER_SLUG_TOO_LONG", `${pagePath}/slug`, "Page slug exceeds template limit");
    }

    const sectionIds = new Set<string>();
    const orderKeys = new Set<string>();
    const counts = new Map<string, number>();
    for (const [sectionIndex, section] of page.sections.entries()) {
      const sectionPath = `${pagePath}/sections/${sectionIndex}`;
      if (sectionIds.has(section.id)) {
        report("COMPILER_DUPLICATE_SECTION_ID", `${sectionPath}/id`, "Duplicate section id");
      }
      sectionIds.add(section.id);
      if (orderKeys.has(section.orderKey)) {
        report(
          "COMPILER_DUPLICATE_ORDER_KEY",
          `${sectionPath}/orderKey`,
          "Duplicate section order key",
        );
      }
      orderKeys.add(section.orderKey);
      const sectionDefinition = sectionTypes.get(section.sectionTypeId);
      if (
        !sectionDefinition ||
        !definition.allowedSections.includes(section.sectionTypeId as never)
      ) {
        report("COMPILER_SECTION_NOT_ALLOWED", sectionPath, "Section is not allowed on this page");
      } else {
        if (section.schemaVersion !== sectionDefinition.schema.version) {
          report(
            "COMPILER_SECTION_SCHEMA_VERSION",
            `${sectionPath}/schemaVersion`,
            "Section schema version does not match the exact template",
          );
        }
        const parsed = sectionDefinition.schema.safeParse(section.content);
        if (!parsed.success) {
          diagnostics.push(
            ...parsed.issues.map((issue) => ({
              code: "COMPILER_INVALID_SECTION_CONTENT",
              path: `${sectionPath}/content${issue.path}`,
              message: issue.message,
            })),
          );
        }
      }
      counts.set(section.sectionTypeId, (counts.get(section.sectionTypeId) ?? 0) + 1);
    }
    for (const requirement of definition.requiredSections) {
      const count = counts.get(requirement.sectionTypeId) ?? 0;
      if (count < requirement.minimum) {
        report(
          "COMPILER_REQUIRED_SECTION_MISSING",
          `${pagePath}/sections`,
          `Missing required section ${requirement.sectionTypeId}`,
        );
      }
      if (requirement.maximum !== undefined && count > requirement.maximum) {
        report(
          "COMPILER_SECTION_MAXIMUM_EXCEEDED",
          `${pagePath}/sections`,
          `Too many sections of type ${requirement.sectionTypeId}`,
        );
      }
    }

    if (page.seo !== null) {
      if (!definition.supportsSEO) {
        report("COMPILER_SEO_NOT_SUPPORTED", `${pagePath}/seo`, "Page type does not support SEO");
      } else {
        const result = seoDocumentSchema.safeParse(page.seo);
        if (!result.success) {
          for (const issue of result.error.issues) {
            report(
              "COMPILER_INVALID_SEO",
              `${pagePath}/seo/${issue.path.map(String).join("/")}`,
              issue.message,
            );
          }
        }
      }
    }

    const route = template.routes
      .filter((item) => item.pageTypes.includes(definition.id))
      .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))[0];
    if (!route || slug === null) {
      if (!route)
        report("COMPILER_ROUTE_MISSING", pagePath, "No template route accepts this page type");
    } else {
      const pathname = routePath(slug, page.locale, draft.defaultLocale, route.localePolicy);
      const routeKey = `${page.locale}:${pathname}`;
      if (routeKeys.has(routeKey)) {
        report("COMPILER_ROUTE_CONFLICT", `${pagePath}/slug`, `Duplicate route ${pathname}`);
      }
      routeKeys.add(routeKey);
      compiledRoutes.push({
        routeId: route.id,
        pathname,
        pageId: page.id,
        locale: page.locale,
        indexingPolicy:
          route.indexingPolicy === "noindex" || !definition.supportsIndexing ? "noindex" : "index",
      });
    }
  }

  validateNavigation(draft, template, pageIds, pageTypeById, report);
  const parsedTheme = template.theme.schema.safeParse(draft.theme);
  if (!parsedTheme.success) {
    diagnostics.push(
      ...parsedTheme.issues.map((issue) => ({
        code: "COMPILER_INVALID_THEME",
        path: `/theme${issue.path}`,
        message: issue.message,
      })),
    );
  }
  validateMedia(draft, report);
  validateMediaReferences(draft, report);

  const sortedDiagnostics = diagnostics.sort(
    (left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code),
  );
  if (sortedDiagnostics.length || !settings.success || !parsedTheme.success) {
    return { success: false, diagnostics: sortedDiagnostics };
  }

  try {
    const snapshot = sealSnapshot({
      snapshotVersion: PUBLICATION_SNAPSHOT_VERSION,
      publicationId: draft.publicationId,
      organizationId: draft.organizationId,
      websiteId: draft.websiteId,
      sourceDraftRevision: String(draft.revision),
      template: {
        id: template.manifest.id,
        version: template.manifest.version,
        artifactHash,
        manifestHash,
      },
      website: {
        name: draft.name,
        defaultLocale: draft.defaultLocale,
        settingsSchemaVersion: template.websiteSchema.version,
        settings: settings.value,
      },
      locales: [...draft.locales].sort((left, right) => left.locale.localeCompare(right.locale)),
      routes: compiledRoutes.sort(
        (left, right) =>
          left.locale.localeCompare(right.locale) || left.pathname.localeCompare(right.pathname),
      ),
      pages: [...draft.pages]
        .sort(
          (left, right) =>
            left.locale.localeCompare(right.locale) ||
            (normalizeSlug(left.slug) ?? "").localeCompare(normalizeSlug(right.slug) ?? "") ||
            left.id.localeCompare(right.id),
        )
        .map((page) => ({
          ...page,
          seo: page.seo as never,
          sections: [...page.sections]
            .sort(
              (left, right) =>
                left.orderKey.localeCompare(right.orderKey) || left.id.localeCompare(right.id),
            )
            .map((section) => ({
              ...section,
              visibility: section.visibility ?? null,
            })),
        })),
      navigation: [...draft.navigation]
        .sort(
          (left, right) =>
            left.definitionId.localeCompare(right.definitionId) ||
            (left.locale ?? "").localeCompare(right.locale ?? ""),
        )
        .map((navigation) => ({
          ...navigation,
          schemaVersion: navigation.schemaVersion ?? template.compatibility.contentSchemaVersion,
          nodes: [...navigation.nodes],
        })),
      theme: parsedTheme.value,
      themeSchemaVersion: template.theme.schemaVersion,
      media: [...draft.media]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((item) => ({ ...item, contentHash: item.contentHash ?? null })),
      capabilities: draft.capabilities ?? {},
    });
    return { success: true, snapshot, hash: snapshotHash(snapshot) };
  } catch (error) {
    return {
      success: false,
      diagnostics: [
        {
          code: "COMPILER_SNAPSHOT_CONTRACT",
          path: "/",
          message: error instanceof Error ? error.message : "Snapshot contract failed",
        },
      ],
    };
  }
}

function validateLocales(
  draft: DraftProjection,
  report: (code: string, path: string, message: string) => void,
): void {
  const locales = new Map<string, string | null>();
  for (const [index, item] of draft.locales.entries()) {
    if (locales.has(item.locale))
      report("COMPILER_DUPLICATE_LOCALE", `/locales/${index}`, "Duplicate locale");
    if (item.fallbackLocale === item.locale) {
      report(
        "COMPILER_LOCALE_SELF_FALLBACK",
        `/locales/${index}/fallbackLocale`,
        "Locale cannot fall back to itself",
      );
    }
    locales.set(item.locale, item.fallbackLocale);
  }
  if (!locales.has(draft.defaultLocale)) {
    report("COMPILER_DEFAULT_LOCALE_MISSING", "/defaultLocale", "Default locale is not configured");
  }
  for (const [locale, fallback] of locales) {
    if (fallback !== null && !locales.has(fallback)) {
      report(
        "COMPILER_FALLBACK_LOCALE_MISSING",
        `/locales/${locale}`,
        "Fallback locale is not configured",
      );
    }
    const visited = new Set<string>();
    let current: string | null = locale;
    while (current !== null) {
      if (visited.has(current)) {
        report(
          "COMPILER_LOCALE_FALLBACK_CYCLE",
          `/locales/${locale}`,
          "Locale fallback cycle detected",
        );
        break;
      }
      visited.add(current);
      current = locales.get(current) ?? null;
    }
  }
}

function validateNavigation(
  draft: DraftProjection,
  template: TemplateDefinition,
  pageIds: ReadonlySet<string>,
  pageTypeById: ReadonlyMap<string, string>,
  report: (code: string, path: string, message: string) => void,
): void {
  const definitions = new Map(template.navigation.map((item) => [item.id as string, item]));
  const scopes = new Set<string>();
  for (const [index, navigation] of draft.navigation.entries()) {
    const path = `/navigation/${index}`;
    const definition = definitions.get(navigation.definitionId);
    if (!definition) {
      report(
        "COMPILER_UNKNOWN_NAVIGATION",
        `${path}/definitionId`,
        "Unknown navigation definition",
      );
      continue;
    }
    const scope = `${navigation.definitionId}:${navigation.locale ?? ""}`;
    if (scopes.has(scope))
      report("COMPILER_DUPLICATE_NAVIGATION", path, "Duplicate navigation scope");
    scopes.add(scope);
    if (definition.localization === "shared" && navigation.locale !== null) {
      report(
        "COMPILER_NAVIGATION_LOCALE",
        `${path}/locale`,
        "Shared navigation cannot have a locale",
      );
    }
    const nodeIds = new Set<string>();
    for (const [nodeIndex, node] of navigation.nodes.entries()) {
      validateNavigationNode(
        node,
        `${path}/nodes/${nodeIndex}`,
        1,
        definition.maximumDepth,
        nodeIds,
        pageIds,
        pageTypeById,
        definition,
        report,
      );
    }
  }
}

function validateNavigationNode(
  node: JsonValue,
  path: string,
  depth: number,
  maximumDepth: number,
  nodeIds: Set<string>,
  pageIds: ReadonlySet<string>,
  pageTypeById: ReadonlyMap<string, string>,
  definition: TemplateDefinition["navigation"][number],
  report: (code: string, path: string, message: string) => void,
): void {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    report("COMPILER_INVALID_NAVIGATION_NODE", path, "Navigation node must be an object");
    return;
  }
  if (depth > maximumDepth)
    report("COMPILER_NAVIGATION_DEPTH", path, "Navigation exceeds maximum depth");
  const id = node.id;
  const kind = node.kind;
  if (typeof id !== "string" || !id)
    report("COMPILER_NAVIGATION_NODE_ID", `${path}/id`, "Node id is required");
  else if (nodeIds.has(id))
    report("COMPILER_DUPLICATE_NAVIGATION_NODE", `${path}/id`, "Duplicate node id");
  else nodeIds.add(id);
  if (
    typeof kind !== "string" ||
    !definition.allowedNodeKinds.includes(kind as "page" | "external" | "label")
  ) {
    report("COMPILER_NAVIGATION_NODE_KIND", `${path}/kind`, "Navigation node kind is not allowed");
  }
  if (kind === "page" && (typeof node.pageId !== "string" || !pageIds.has(node.pageId))) {
    report("COMPILER_NAVIGATION_PAGE", `${path}/pageId`, "Navigation page reference is invalid");
  }
  if (
    kind === "page" &&
    typeof node.pageId === "string" &&
    definition.allowedPageTypes !== "all" &&
    !definition.allowedPageTypes.includes(pageTypeById.get(node.pageId) as never)
  ) {
    report(
      "COMPILER_NAVIGATION_PAGE_TYPE",
      `${path}/pageId`,
      "Page type is not allowed in this navigation",
    );
  }
  if (kind === "external" && (typeof node.href !== "string" || !isSafeUrl(node.href))) {
    report("COMPILER_NAVIGATION_URL", `${path}/href`, "External URL must use HTTPS");
  }
  const visibility = definition.visibilitySchema.safeParse(node.visibility ?? {});
  if (!visibility.success) {
    visibility.issues.forEach((issue) =>
      report("COMPILER_NAVIGATION_VISIBILITY", `${path}/visibility${issue.path}`, issue.message),
    );
  }
  if (node.children !== undefined) {
    if (!Array.isArray(node.children))
      report("COMPILER_NAVIGATION_CHILDREN", `${path}/children`, "Children must be an array");
    else
      node.children.forEach((child, index) =>
        validateNavigationNode(
          child,
          `${path}/children/${index}`,
          depth + 1,
          maximumDepth,
          nodeIds,
          pageIds,
          pageTypeById,
          definition,
          report,
        ),
      );
  }
}

function validateMedia(
  draft: DraftProjection,
  report: (code: string, path: string, message: string) => void,
): void {
  const ids = new Set<string>();
  draft.media.forEach((item, index) => {
    const path = `/media/${index}`;
    if (ids.has(item.id)) report("COMPILER_DUPLICATE_MEDIA", `${path}/id`, "Duplicate media id");
    ids.add(item.id);
    if (!isSafeUrl(item.url)) report("COMPILER_MEDIA_URL", `${path}/url`, "Media URL is unsafe");
    if (
      item.contentHash !== undefined &&
      item.contentHash !== null &&
      !/^[0-9a-f]{64}$/.test(item.contentHash)
    ) {
      report("COMPILER_MEDIA_HASH", `${path}/contentHash`, "Media hash is invalid");
    }
    for (const [variant, url] of Object.entries(item.variants)) {
      if (!/^[a-z][a-z0-9-]*$/.test(variant) || !isSafeUrl(url)) {
        report("COMPILER_MEDIA_VARIANT", `${path}/variants/${variant}`, "Media variant is invalid");
      }
    }
  });
}

function validateMediaReferences(
  draft: DraftProjection,
  report: (code: string, path: string, message: string) => void,
): void {
  const available = new Set(draft.media.map((item) => item.id));
  const walk = (value: JsonValue, path: string): void => {
    if (Array.isArray(value)) value.forEach((child, index) => walk(child, `${path}/${index}`));
    else if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (
          (key === "mediaId" || key.endsWith("MediaId")) &&
          typeof child === "string" &&
          !available.has(child)
        ) {
          report(
            "COMPILER_MEDIA_REFERENCE_MISSING",
            `${path}/${key}`,
            "Referenced media is not ready or pinned",
          );
        }
        walk(child, `${path}/${key}`);
      }
    }
  };
  walk(draft.settings, "/settings");
  draft.pages.forEach((page, pageIndex) =>
    page.sections.forEach((section, sectionIndex) =>
      walk(section.content, `/pages/${pageIndex}/sections/${sectionIndex}/content`),
    ),
  );
}

function defaultSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "page"
  );
}

function normalizeSlug(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "/" || trimmed === "") return "";
  const slug = trimmed.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (
    !slug ||
    slug.length > 240 ||
    !/^[a-z0-9](?:[a-z0-9/_-]*[a-z0-9])?$/.test(slug) ||
    slug.includes("//")
  ) {
    return null;
  }
  return slug;
}

function routePath(
  slug: string,
  locale: string,
  defaultLocale: string,
  policy: "default" | "prefix" | "prefix-except-default",
): string {
  const base = slug ? `/${slug}` : "/";
  const prefixed =
    policy === "prefix" || (policy === "prefix-except-default" && locale !== defaultLocale);
  if (!prefixed) return base;
  return slug ? `/${locale}/${slug}` : `/${locale}`;
}

function isSafeUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
