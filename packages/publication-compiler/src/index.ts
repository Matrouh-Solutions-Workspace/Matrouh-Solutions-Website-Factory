import type { JsonValue, TemplateDefinition, ThemeTokens } from "@factory/template-sdk";
import {
  PUBLICATION_SNAPSHOT_VERSION,
  parseSnapshot,
  snapshotHash,
  type PublicationSnapshot,
} from "@factory/publication-contract";

export interface DraftProjection {
  organizationId: string;
  websiteId: string;
  publicationId: string;
  revision: bigint;
  name: string;
  defaultLocale: string;
  settings: JsonValue;
  locales: { locale: string; fallbackLocale: string | null }[];
  pages: {
    id: string;
    pageTypeId: string;
    locale: string;
    title: string;
    slug: string;
    seo: JsonValue | null;
    sections: {
      id: string;
      sectionTypeId: string;
      schemaVersion: number;
      content: JsonValue;
      orderKey: string;
    }[];
  }[];
  navigation: { definitionId: string; locale: string | null; nodes: JsonValue[] }[];
  theme: ThemeTokens;
  media: { id: string; url: string; variants: Record<string, string> }[];
}
export interface CompilationDiagnostic {
  code: string;
  path: string;
  message: string;
}
export type CompilationResult =
  | { success: true; snapshot: PublicationSnapshot; hash: string }
  | { success: false; diagnostics: CompilationDiagnostic[] };

export function compilePublication(
  draft: DraftProjection,
  template: TemplateDefinition,
  artifactHash: string,
): CompilationResult {
  const diagnostics: CompilationDiagnostic[] = [];
  const pageTypes = new Map(template.pages.map((item) => [item.id as string, item]));
  const sectionTypes = new Map(template.sections.map((item) => [item.id as string, item]));
  for (const [pageIndex, page] of draft.pages.entries()) {
    const definition = pageTypes.get(page.pageTypeId);
    if (!definition) {
      diagnostics.push({
        code: "COMPILER_UNKNOWN_PAGE_TYPE",
        path: `/pages/${pageIndex}/pageTypeId`,
        message: "Unknown page type",
      });
      continue;
    }
    const counts = new Map<string, number>();
    for (const [sectionIndex, section] of page.sections.entries()) {
      const sectionDefinition = sectionTypes.get(section.sectionTypeId);
      if (
        !sectionDefinition ||
        !definition.allowedSections.some((id) => id === section.sectionTypeId)
      )
        diagnostics.push({
          code: "COMPILER_SECTION_NOT_ALLOWED",
          path: `/pages/${pageIndex}/sections/${sectionIndex}`,
          message: "Section is not allowed on this page",
        });
      else {
        const parsed = sectionDefinition.schema.safeParse(section.content);
        if (!parsed.success)
          diagnostics.push(
            ...parsed.issues.map((issue) => ({
              code: "COMPILER_INVALID_SECTION_CONTENT",
              path: `/pages/${pageIndex}/sections/${sectionIndex}${issue.path}`,
              message: issue.message,
            })),
          );
      }
      counts.set(section.sectionTypeId, (counts.get(section.sectionTypeId) ?? 0) + 1);
    }
    for (const required of definition.requiredSections)
      if ((counts.get(required.sectionTypeId) ?? 0) < required.minimum)
        diagnostics.push({
          code: "COMPILER_REQUIRED_SECTION_MISSING",
          path: `/pages/${pageIndex}/sections`,
          message: `Missing required section ${required.sectionTypeId}`,
        });
  }
  const themeResult = template.theme.schema.safeParse(draft.theme);
  if (!themeResult.success)
    diagnostics.push(
      ...themeResult.issues.map((issue) => ({
        code: "COMPILER_INVALID_THEME",
        path: `/theme${issue.path}`,
        message: issue.message,
      })),
    );
  if (diagnostics.length) return { success: false, diagnostics };
  const routes = draft.pages.map((page) => ({
    routeId: template.routes[0]?.id as string,
    pathname: page.slug === "/" ? "/" : `/${page.slug.replace(/^\/+/, "")}`,
    pageId: page.id,
    locale: page.locale,
  }));
  const snapshot = parseSnapshot({
    snapshotVersion: PUBLICATION_SNAPSHOT_VERSION,
    publicationId: draft.publicationId,
    organizationId: draft.organizationId,
    websiteId: draft.websiteId,
    sourceDraftRevision: String(draft.revision),
    template: { id: template.manifest.id, version: template.manifest.version, artifactHash },
    website: { name: draft.name, defaultLocale: draft.defaultLocale, settings: draft.settings },
    locales: draft.locales,
    routes,
    pages: draft.pages.map((page) => ({
      ...page,
      sections: [...page.sections].sort((a, b) => a.orderKey.localeCompare(b.orderKey)),
    })),
    navigation: draft.navigation,
    theme: draft.theme,
    media: draft.media,
  });
  return { success: true, snapshot, hash: snapshotHash(snapshot) };
}
