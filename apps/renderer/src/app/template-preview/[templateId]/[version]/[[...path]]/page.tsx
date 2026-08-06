import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PublicationSnapshot } from "@factory/publication-contract";
import type { ThemeTokens } from "@factory/template-sdk";
import { loadCatalogPreview } from "@/server/catalog-preview";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface CatalogPreviewProperties {
  readonly params: Promise<{
    readonly templateId: string;
    readonly version: string;
    readonly path?: string[];
  }>;
}

export async function generateMetadata({ params }: CatalogPreviewProperties): Promise<Metadata> {
  const { templateId, version, path = [] } = await params;
  const preview = await safePreview(templateId, version, `/${path.join("/")}`);
  return {
    title: preview ? `${preview.rendered.title} · Template preview` : "Template preview",
    robots: { index: false, follow: false, noarchive: true, noimageindex: true },
  };
}

export default async function CatalogPreviewPage({ params }: CatalogPreviewProperties) {
  const { templateId, version, path = [] } = await params;
  const preview = await safePreview(templateId, version, `/${path.join("/")}`);
  if (!preview) notFound();
  const navigation = navigationLinks(preview.snapshot, preview.rendered.locale);
  return (
    <div style={themeVariables(preview.snapshot.theme)}>
      <aside className="previewBanner">Template preview · default content</aside>
      <header className="siteHeader">
        <a className="siteBrand" href={`${preview.prefix}/`}>
          <img alt="" className="siteBrandMark" src="/matrouh-logo.png" />
          <strong>{preview.snapshot.website.name}</strong>
        </a>
        <nav aria-label="Preview navigation">
          {navigation.map((item) => (
            <a href={`${preview.prefix}${item.href}`} key={item.id}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <main>{preview.rendered.node}</main>
      <footer className="siteFooter">
        <div>
          <strong>{preview.snapshot.website.name}</strong>
          <p>Default template content. Create a draft to customize it.</p>
        </div>
        <nav aria-label="Preview footer navigation">
          {navigation.map((item) => (
            <a href={`${preview.prefix}${item.href}`} key={item.id}>
              {item.label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  );
}

async function safePreview(templateId: string, version: string, pathname: string) {
  try {
    return await loadCatalogPreview(templateId, version, pathname);
  } catch {
    return null;
  }
}

function navigationLinks(snapshot: PublicationSnapshot, locale: string) {
  const navigation =
    snapshot.navigation.find((item) => item.locale === locale) ??
    snapshot.navigation.find((item) => item.locale === null);
  if (!navigation) {
    return snapshot.pages
      .filter((page) => page.locale === locale)
      .map((page) => ({
        id: page.id,
        href: routeForPage(snapshot, page.id, locale),
        label: page.title,
      }));
  }
  return navigation.nodes.flatMap((node) => navigationNodeLink(node, snapshot, locale));
}

function navigationNodeLink(value: unknown, snapshot: PublicationSnapshot, locale: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const node = value as Record<string, unknown>;
  if (node.kind !== "page" || typeof node.pageId !== "string") return [];
  const labels = node.label;
  const label =
    labels && typeof labels === "object" && !Array.isArray(labels)
      ? Object.values(labels).find((item): item is string => typeof item === "string")
      : undefined;
  return [
    {
      id: typeof node.id === "string" ? node.id : node.pageId,
      href: routeForPage(snapshot, node.pageId, locale),
      label: label ?? "Page",
    },
  ];
}

function routeForPage(snapshot: PublicationSnapshot, pageId: string, locale: string): string {
  return (
    snapshot.routes.find((route) => route.pageId === pageId && route.locale === locale)?.pathname ??
    "/"
  );
}

function themeVariables(theme: ThemeTokens): React.CSSProperties {
  const variables: Record<string, string> = {};
  const visit = (value: unknown, prefix: string): void => {
    if (typeof value === "string" || typeof value === "number")
      variables[`--${prefix}`] = String(value);
    else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, child]) =>
        visit(child, `${prefix}-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`),
      );
    }
  };
  visit(theme, "theme");
  const colors = theme.colors as Record<string, unknown>;
  variables["--background"] = tokenValue(colors.background, "#fff");
  variables["--text"] = tokenValue(colors.text, "#17221f");
  variables["--primary"] = tokenValue(colors.primary, "#ffcc00");
  return variables;
}

function tokenValue(value: unknown, fallback: string): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}
