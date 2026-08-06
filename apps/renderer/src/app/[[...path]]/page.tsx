import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PublicationSnapshot } from "@factory/publication-contract";
import type { ThemeTokens } from "@factory/template-sdk";
import { instantiateTemplateRuntime } from "@factory/template-runtime";
import { loadSite } from "@/server/site";

interface PageProperties {
  readonly params: Promise<{ readonly path?: string[] }>;
}

export async function generateMetadata({ params }: PageProperties): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  const site = await loadSite(host);
  if (!site) return { robots: { index: false, follow: false } };
  const { path = [] } = await params;
  try {
    const rendered = runtime(site).render(`/${path.join("/")}`);
    const canonicalPath = rendered.seo?.canonicalPath ?? `/${path.join("/")}`;
    return {
      title: rendered.title,
      ...(rendered.description === undefined ? {} : { description: rendered.description }),
      alternates: { canonical: absoluteUrl(host, canonicalPath) },
      robots:
        rendered.indexingPolicy === "noindex"
          ? { index: false, follow: false }
          : (rendered.seo?.robots ?? { index: true, follow: true }),
      ...(rendered.seo?.openGraph === undefined
        ? {}
        : { openGraph: rendered.seo.openGraph as Metadata["openGraph"] }),
      ...(rendered.seo?.twitter === undefined
        ? {}
        : { twitter: rendered.seo.twitter as Metadata["twitter"] }),
    };
  } catch {
    return { title: site.snapshot.website.name, robots: { index: false, follow: false } };
  }
}

export default async function SitePage({ params }: PageProperties) {
  const host = (await headers()).get("host") ?? "";
  const site = await loadSite(host);
  if (!site) notFound();
  const { path = [] } = await params;
  let rendered;
  try {
    rendered = runtime(site).render(`/${path.join("/")}`);
  } catch {
    notFound();
  }
  const structuredData = rendered.seo?.structuredData ?? [];
  const navigation = navigationLinks(site.snapshot, rendered.locale);
  return (
    <div style={themeVariables(site.snapshot.theme)}>
      <header className="siteHeader">
        <a className="siteBrand" href="/">
          <img alt="" className="siteBrandMark" src="/matrouh-logo.png" />
          <strong>{site.snapshot.website.name}</strong>
        </a>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <a href={item.href} key={item.id}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <main>{rendered.node}</main>
      {structuredData.map((document, index) => (
        <script
          // JSON is serialized as text and angle brackets are escaped to prevent script termination.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(document).replace(/</g, "\\u003c") }}
          key={index}
          type="application/ld+json"
        />
      ))}
      <footer className="siteFooter">
        <div>
          <strong>{site.snapshot.website.name}</strong>
          <p>Thoughtful care, clearly communicated.</p>
        </div>
        <nav aria-label="Footer navigation">
          {navigation.map((item) => (
            <a href={item.href} key={item.id}>
              {item.label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  );
}

function runtime(site: NonNullable<Awaited<ReturnType<typeof loadSite>>>) {
  return instantiateTemplateRuntime(
    {
      definition: site.template,
      artifactHash: site.artifact.artifactHash,
      manifestHash: site.artifact.manifest.manifestHash,
    },
    site.snapshot,
  );
}

function routeForPage(snapshot: PublicationSnapshot, pageId: string, locale: string) {
  return (
    snapshot.routes.find((route) => route.pageId === pageId && route.locale === locale)?.pathname ??
    "#"
  );
}

function navigationLinks(
  snapshot: PublicationSnapshot,
  locale: string,
): { id: string; href: string; label: string }[] {
  const navigation =
    snapshot.navigation.find((item) => item.locale === locale) ??
    snapshot.navigation.find((item) => item.locale === null);
  if (!navigation) {
    return snapshot.pages
      .filter((page) => page.locale === locale)
      .map((page) => ({
        id: page.id,
        href: routeForPage(snapshot, page.id, page.locale),
        label: page.title,
      }));
  }
  return navigation.nodes.flatMap((node) => navigationNodeLink(node, snapshot, locale));
}

function navigationNodeLink(
  value: unknown,
  snapshot: PublicationSnapshot,
  locale: string,
): { id: string; href: string; label: string }[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const node = value as Record<string, unknown>;
  const id = typeof node.id === "string" ? node.id : "";
  if (!id || !isVisible(node.visibility)) return [];
  const label = localizedLabel(node.label, locale);
  if (node.kind === "page" && typeof node.pageId === "string") {
    return [{ id, href: routeForPage(snapshot, node.pageId, locale), label }];
  }
  if (node.kind === "external" && typeof node.href === "string") {
    return [{ id, href: node.href, label }];
  }
  return [];
}

function localizedLabel(value: unknown, locale: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const labels = value as Record<string, unknown>;
    const selected =
      labels[locale] ?? Object.values(labels).find((item) => typeof item === "string");
    if (typeof selected === "string" && selected.trim()) return selected;
  }
  return "Link";
}

function isVisible(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  return (value as Record<string, unknown>).visible !== false;
}

function absoluteUrl(host: string, path: string): string {
  const protocol = host.startsWith("localhost") || host.includes(".localhost") ? "http" : "https";
  return `${protocol}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}

function themeVariables(theme: ThemeTokens): React.CSSProperties {
  const variables: Record<string, string> = {};
  const visit = (value: unknown, prefix: string): void => {
    if (typeof value === "string" || typeof value === "number") {
      variables[`--${prefix}`] = String(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, child]) =>
        visit(child, `${prefix}-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`),
      );
    }
  };
  visit(theme, "theme");
  variables["--background"] =
    theme.colors && typeof theme.colors === "object"
      ? String((theme.colors as Record<string, unknown>).background)
      : "#fff";
  variables["--text"] =
    theme.colors && typeof theme.colors === "object"
      ? String((theme.colors as Record<string, unknown>).text)
      : "#17221f";
  variables["--primary"] =
    theme.colors && typeof theme.colors === "object"
      ? String((theme.colors as Record<string, unknown>).primary)
      : "#087f6d";
  return variables;
}
