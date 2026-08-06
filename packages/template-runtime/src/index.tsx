import { Fragment, createElement, type ReactNode } from "react";
import { verifySnapshotIntegrity, type PublicationSnapshot } from "@factory/publication-contract";
import {
  buildPortableManifest,
  type CapabilityGateway,
  type SeoDocument,
  type TemplateDefinition,
  type TemplateRenderContext,
} from "@factory/template-sdk";

export class TemplateRuntimeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TemplateRuntimeError";
  }
}

export interface RuntimeArtifact {
  readonly definition: TemplateDefinition;
  readonly artifactHash: string;
  readonly manifestHash: string;
  readonly capabilities?: CapabilityGateway;
}

export interface TemplateRuntime {
  resolveRoute(pathname: string): PublicationSnapshot["routes"][number] | null;
  render(pathname: string): RenderedPage;
}

export interface RenderedPage {
  readonly node: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly seo: SeoDocument | null;
  readonly locale: string;
  readonly routeId: string;
  readonly indexingPolicy: "index" | "noindex";
}

export function instantiateTemplateRuntime(
  artifact: RuntimeArtifact,
  snapshot: PublicationSnapshot,
): TemplateRuntime {
  verifySnapshotIntegrity(snapshot);
  if (
    artifact.definition.manifest.id !== snapshot.template.id ||
    artifact.definition.manifest.version !== snapshot.template.version ||
    artifact.artifactHash !== snapshot.template.artifactHash ||
    artifact.manifestHash !== snapshot.template.manifestHash ||
    buildPortableManifest(artifact.definition).manifestHash !== artifact.manifestHash
  ) {
    throw new TemplateRuntimeError(
      "RUNTIME_ARTIFACT_IDENTITY_MISMATCH",
      "Template artifact does not match the publication snapshot",
    );
  }
  const routes = new Map(
    snapshot.routes.map((route) => [normalizePathname(route.pathname), route]),
  );
  return Object.freeze({
    resolveRoute: (pathname: string) => routes.get(normalizePathname(pathname)) ?? null,
    render: (pathname: string) =>
      renderSnapshotPage(
        artifact.definition,
        snapshot,
        normalizePathname(pathname),
        artifact.capabilities,
      ),
  });
}

export function renderSnapshotPage(
  template: TemplateDefinition,
  snapshot: PublicationSnapshot,
  pathname: string,
  capabilities: CapabilityGateway = unavailableCapabilities,
): RenderedPage {
  verifySnapshotIntegrity(snapshot);
  if (
    template.manifest.id !== snapshot.template.id ||
    template.manifest.version !== snapshot.template.version ||
    buildPortableManifest(template).manifestHash !== snapshot.template.manifestHash
  ) {
    throw new TemplateRuntimeError(
      "RUNTIME_TEMPLATE_IDENTITY_MISMATCH",
      "Template identity mismatch",
    );
  }
  const normalizedPath = normalizePathname(pathname);
  const route = snapshot.routes.find((item) => item.pathname === normalizedPath);
  if (!route) throw new TemplateRuntimeError("RUNTIME_ROUTE_NOT_FOUND", "Route was not found");
  const routeDefinition = template.routes.find((item) => item.id === route.routeId);
  if (!routeDefinition) {
    throw new TemplateRuntimeError("RUNTIME_ROUTE_UNKNOWN", "Snapshot route definition is unknown");
  }
  const page = snapshot.pages.find(
    (item) => item.id === route.pageId && item.locale === route.locale,
  );
  if (!page) throw new TemplateRuntimeError("RUNTIME_PAGE_NOT_FOUND", "Snapshot page is missing");
  if (!routeDefinition.pageTypes.includes(page.pageTypeId as never)) {
    throw new TemplateRuntimeError(
      "RUNTIME_PAGE_ROUTE_MISMATCH",
      "Page type is not allowed by route",
    );
  }
  const definitions = new Map(template.sections.map((item) => [item.id as string, item]));
  const navigation = Object.fromEntries(
    snapshot.navigation.map((item) => [
      `${item.definitionId}:${item.locale ?? ""}`,
      { definitionId: item.definitionId, locale: item.locale, nodes: item.nodes },
    ]),
  );
  const media = new Map(snapshot.media.map((item) => [item.id, item]));
  const context: TemplateRenderContext = Object.freeze({
    request: Object.freeze({ pathname: normalizedPath, search: {}, variantFlags: {} }),
    website: Object.freeze({
      id: snapshot.websiteId,
      name: snapshot.website.name,
      defaultLocale: snapshot.website.defaultLocale,
      settings: snapshot.website.settings,
    }),
    locale: page.locale,
    theme: snapshot.theme,
    navigation: Object.freeze(navigation),
    media: Object.freeze({
      url: (id: string, variant?: string) => {
        const item = media.get(id);
        if (!item) throw new TemplateRuntimeError("RUNTIME_MEDIA_UNKNOWN", "Media is not pinned");
        return variant === undefined ? item.url : (item.variants[variant] ?? item.url);
      },
    }),
    links: Object.freeze({ url: safeLink }),
    features: capabilities,
  });
  const children = page.sections.map((section) => {
    const definition = definitions.get(section.sectionTypeId);
    if (!definition) {
      throw new TemplateRuntimeError("RUNTIME_SECTION_UNKNOWN", "Snapshot section type is unknown");
    }
    if (definition.schema.version !== section.schemaVersion) {
      throw new TemplateRuntimeError(
        "RUNTIME_SECTION_SCHEMA_MISMATCH",
        "Snapshot section schema version is incompatible",
      );
    }
    try {
      return createElement(
        Fragment,
        { key: section.id },
        definition.render({ value: section.content, context }),
      );
    } catch (error) {
      throw new TemplateRuntimeError(
        "RUNTIME_TEMPLATE_EXECUTION_FAILED",
        "Template render failed",
        {
          cause: error,
        },
      );
    }
  });
  const seo = page.seo as SeoDocument | null;
  return Object.freeze({
    node: createElement(Fragment, null, ...children),
    title: seo?.title ?? page.title,
    ...(seo?.description === undefined ? {} : { description: seo.description }),
    seo,
    locale: page.locale,
    routeId: route.routeId,
    indexingPolicy: route.indexingPolicy,
  });
}

const unavailableCapabilities: CapabilityGateway = Object.freeze({
  available: () => false,
});

function safeLink(path: string): string {
  if (path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")) return path;
  try {
    const url = new URL(path);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // Fall through to a safe inert link.
  }
  return "#";
}

function normalizePathname(pathname: string): string {
  let decoded: string;
  try {
    decoded = decodeURI(pathname);
  } catch {
    throw new TemplateRuntimeError("RUNTIME_PATH_INVALID", "Path encoding is invalid");
  }
  const normalized = `/${decoded.replace(/^\/+/, "").replace(/\/{2,}/g, "/")}`;
  if (normalized.includes("\\") || normalized.split("/").includes("..")) {
    throw new TemplateRuntimeError("RUNTIME_PATH_INVALID", "Path is invalid");
  }
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
}
