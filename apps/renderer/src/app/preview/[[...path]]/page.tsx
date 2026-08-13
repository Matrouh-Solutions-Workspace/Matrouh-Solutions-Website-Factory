import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PublicationSnapshot } from "@factory/publication-contract";
import type { ThemeTokens } from "@factory/template-sdk";
import { instantiateTemplateRuntime } from "@factory/template-runtime";
import { SiteNavigation } from "@/app/site-navigation";
import { localeLinks, localizedPageRoute, textDirection } from "@/server/locale-navigation";
import { loadPreviewSite } from "@/server/site";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface PreviewProperties {
  readonly params: Promise<{ readonly path?: string[] }>;
  readonly searchParams: Promise<{ readonly token?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PreviewProperties): Promise<Metadata> {
  const site = await loadPreviewSite((await searchParams).token);
  if (!site) return { robots: { index: false, follow: false } };
  const { path = [] } = await params;
  try {
    const rendered = runtime(site).render(`/${path.join("/")}`);
    return {
      title: `Preview: ${rendered.title}`,
      icons: site.branding.faviconUrl ? { icon: site.branding.faviconUrl } : undefined,
      ...(rendered.description === undefined ? {} : { description: rendered.description }),
      robots: { index: false, follow: false, noarchive: true, noimageindex: true },
    };
  } catch {
    return { title: "Preview", robots: { index: false, follow: false } };
  }
}

export default async function PreviewPage({ params, searchParams }: PreviewProperties) {
  const token = (await searchParams).token;
  const site = await loadPreviewSite(token);
  if (!site) notFound();
  const { path = [] } = await params;
  let rendered;
  try {
    rendered = runtime(site).render(`/${path.join("/")}`);
  } catch {
    notFound();
  }
  const navigation = navigationLinks(site.snapshot, rendered.locale);
  const localizedRoutes = localeLinks(site.snapshot, `/${path.join("/")}`);
  const homeHref = localizedHomeRoute(site.snapshot, rendered.locale);
  const appearance = websiteSetting(site.snapshot, "colorMode") === "dark" ? "dark" : "light";
  const logoId = websiteSetting(site.snapshot, "logoMediaId");
  const logoUrl =
    typeof logoId === "string"
      ? site.snapshot.media.find((item) => item.id === logoId)?.url
      : undefined;
  return (
    <div
      className="siteRoot"
      data-color-scheme={appearance}
      data-template-artifact-id={site.snapshot.template.id}
      data-template-id={premiumTemplateId(
        site.snapshot.template.id,
        site.snapshot.template.version,
      )}
      data-template-version={site.snapshot.template.version}
      dir={textDirection(rendered.locale)}
      lang={rendered.locale}
      style={themeVariables(site.snapshot.theme)}
    >
      <aside className="previewBanner">Private preview · expires automatically</aside>
      <header className="siteHeader">
        <a className="siteBrand" href={previewRoute(homeHref, token)}>
          <img
            alt=""
            className="siteBrandMark"
            src={logoUrl ?? site.branding.faviconUrl ?? "/matrouh-logo.png"}
          />
          <strong>{site.snapshot.website.name}</strong>
        </a>
        <SiteNavigation
          appearanceStorageKey={`factory:appearance:preview:${site.organizationId}:${site.snapshot.websiteId}`}
          ariaLabel={rendered.locale === "ar" ? "تنقل المعاينة" : "Preview navigation"}
          initialAppearance={appearance}
          items={navigation.map((item) => ({
            ...item,
            href: previewRoute(item.href, token),
          }))}
          locale={rendered.locale}
          localeItems={localizedRoutes.map((item) => ({
            current: item.current,
            direction: textDirection(item.locale),
            href: previewRoute(item.href, token),
            id: item.locale,
            label: localeLabel(item.locale),
            locale: item.locale,
          }))}
          showAppearanceToggle={websiteSetting(site.snapshot, "allowAppearanceToggle") !== false}
        />
      </header>
      <main>{rendered.node}</main>
      <footer className="siteFooter">
        <div>
          <strong>{site.snapshot.website.name}</strong>
        </div>
        <nav
          aria-label={
            rendered.locale === "ar" ? "تنقل تذييل المعاينة" : "Preview footer navigation"
          }
        >
          {navigation.map((item) => (
            <a href={previewRoute(item.href, token)} key={item.id}>
              {item.label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  );
}

function premiumTemplateId(templateId: string, version: string): string | undefined {
  const premiumVersions: Readonly<Record<string, string>> = {
    "com.matrouh.engineer": "2.0.0",
    "com.matrouh.doctor": "2.0.0",
    "com.matrouh.clinic": "2.0.0",
  };
  return premiumVersions[templateId] === version ? templateId : undefined;
}

function websiteSetting(snapshot: PublicationSnapshot, key: string): unknown {
  const settings = snapshot.website.settings;
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)[key]
    : undefined;
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
  return locale === "ar" ? "رابط" : "Link";
}

function isVisible(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  return (value as Record<string, unknown>).visible !== false;
}

function routeForPage(snapshot: PublicationSnapshot, pageId: string, locale: string): string {
  return localizedPageRoute(snapshot, pageId, locale) ?? "#";
}

function localizedHomeRoute(snapshot: PublicationSnapshot, locale: string): string {
  const homePage = snapshot.pages.find((page) => page.locale === locale && page.slug === "/");
  if (!homePage) return "/";
  return localizedPageRoute(snapshot, homePage.id, locale) ?? "/";
}

function localeLabel(locale: string): string {
  if (locale.toLowerCase().startsWith("ar")) return "العربية";
  if (locale.toLowerCase().startsWith("en")) return "English";
  return locale;
}

function previewRoute(href: string, token: string | undefined): string {
  if (/^(?:[a-z]+:|#)/i.test(href)) return href;
  const pathname = href.startsWith("/") ? href : `/${href}`;
  const url = new URL(`/preview${pathname}`, "http://preview.local");
  if (token) url.searchParams.set("token", token);
  return `${url.pathname}${url.search}${url.hash}`;
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
  const colors = theme.colors as Record<string, unknown>;
  variables["--background"] = tokenValue(colors.background, "#fff");
  variables["--text"] = tokenValue(colors.text, "#17221f");
  variables["--primary"] = tokenValue(colors.primary, "#ffcc00");
  return variables;
}

function tokenValue(value: unknown, fallback: string): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function runtime(site: NonNullable<Awaited<ReturnType<typeof loadPreviewSite>>>) {
  return instantiateTemplateRuntime(
    {
      definition: site.template,
      artifactHash: site.artifact.artifactHash,
      manifestHash: site.artifact.manifest.manifestHash,
    },
    site.snapshot,
  );
}
