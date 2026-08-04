import { Fragment, createElement, type ReactNode } from "react";
import type { PublicationSnapshot } from "@factory/publication-contract";
import type { TemplateDefinition, TemplateRenderContext } from "@factory/template-sdk";
export class TemplateRuntimeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TemplateRuntimeError";
  }
}
export interface RenderedPage {
  node: ReactNode;
  title: string;
  description?: string;
}
export function renderSnapshotPage(
  template: TemplateDefinition,
  snapshot: PublicationSnapshot,
  pathname: string,
): RenderedPage {
  const route = snapshot.routes.find((item) => item.pathname === pathname);
  if (!route) throw new TemplateRuntimeError("RUNTIME_ROUTE_NOT_FOUND", pathname);
  const page = snapshot.pages.find(
    (item) => item.id === route.pageId && item.locale === route.locale,
  );
  if (!page) throw new TemplateRuntimeError("RUNTIME_PAGE_NOT_FOUND", route.pageId);
  const definitions = new Map(template.sections.map((item) => [item.id as string, item]));
  const context: TemplateRenderContext = {
    locale: page.locale,
    pathname,
    websiteName: snapshot.website.name,
    theme: snapshot.theme,
    mediaUrl: (id) => snapshot.media.find((item) => item.id === id)?.url ?? "",
    linkUrl: (path) => path,
  };
  const children = page.sections.map((section) => {
    const definition = definitions.get(section.sectionTypeId);
    if (!definition)
      throw new TemplateRuntimeError("RUNTIME_SECTION_UNKNOWN", section.sectionTypeId);
    return createElement(
      Fragment,
      { key: section.id },
      definition.render({ value: section.content, context }),
    );
  });
  const seo = page.seo as Record<string, unknown> | null;
  return {
    node: createElement(Fragment, null, ...children),
    title: typeof seo?.title === "string" ? seo.title : page.title,
    ...(typeof seo?.description === "string" ? { description: seo.description } : {}),
  };
}
