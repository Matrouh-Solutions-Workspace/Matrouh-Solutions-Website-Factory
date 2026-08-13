import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PublicationSnapshot } from "@factory/publication-contract";
import type { ThemeTokens } from "@factory/template-sdk";
import { SiteNavigation } from "@/app/site-navigation";
import { loadCatalogPreview } from "@/server/catalog-preview";
import { localeLinks, localizedPageRoute, textDirection } from "@/server/locale-navigation";

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
  const text = previewText(preview?.rendered.locale);
  return {
    title: preview ? `${preview.rendered.title} ${text.titleSuffix}` : text.title,
    robots: { index: false, follow: false, noarchive: true, noimageindex: true },
  };
}

export default async function CatalogPreviewPage({ params }: CatalogPreviewProperties) {
  const { templateId, version, path = [] } = await params;
  const pathname = `/${path.join("/")}`;
  const preview = await safePreview(templateId, version, pathname);
  if (!preview) notFound();
  const navigation = navigationLinks(preview.snapshot, preview.rendered.locale);
  const localizedRoutes = localeLinks(preview.snapshot, pathname);
  const settings = preview.snapshot.website.settings;
  const appearance =
    settings &&
    typeof settings === "object" &&
    !Array.isArray(settings) &&
    (settings as Record<string, unknown>).colorMode === "dark"
      ? "dark"
      : "light";
  const text = previewText(preview.rendered.locale);
  return (
    <div
      className="siteRoot"
      data-color-scheme={appearance}
      data-template-artifact-id={preview.snapshot.template.id}
      data-template-id={premiumTemplateId(
        preview.snapshot.template.id,
        preview.snapshot.template.version,
      )}
      data-template-version={preview.snapshot.template.version}
      dir={textDirection(preview.rendered.locale)}
      lang={preview.rendered.locale}
      style={themeVariables(preview.snapshot.theme)}
    >
      <aside className="previewBanner">{text.banner}</aside>
      <header className="siteHeader">
        <a className="siteBrand" href={`${preview.prefix}/`}>
          <img alt="" className="siteBrandMark" src="/matrouh-logo.png" />
          <strong>{preview.snapshot.website.name}</strong>
        </a>
        <SiteNavigation
          appearanceStorageKey={`factory:appearance:template:${preview.snapshot.template.id}:${preview.snapshot.template.version}`}
          ariaLabel={text.navigation}
          initialAppearance={appearance}
          items={navigation.map((item) => ({ ...item, href: `${preview.prefix}${item.href}` }))}
          locale={preview.rendered.locale}
          localeItems={localizedRoutes.map((item) => ({
            current: item.current,
            direction: textDirection(item.locale),
            href: `${preview.prefix}${item.href}`,
            id: item.locale,
            label: localeLabel(item.locale),
            locale: item.locale,
          }))}
        />
      </header>
      <main>{preview.rendered.node}</main>
      <footer className="siteFooter">
        <div>
          <strong>{preview.snapshot.website.name}</strong>
          <p>{text.footerDescription}</p>
        </div>
        <nav aria-label={text.footerNavigation}>
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

function previewText(locale: string | undefined) {
  return locale?.toLowerCase().startsWith("ar")
    ? {
        title: "معاينة القالب",
        titleSuffix: "· معاينة القالب",
        banner: "معاينة القالب · محتوى افتراضي",
        navigation: "تنقل المعاينة",
        footerDescription: "محتوى افتراضي للقالب. أنشئ مسودة لتخصيصه.",
        footerNavigation: "تنقل تذييل المعاينة",
      }
    : {
        title: "Template preview",
        titleSuffix: "· Template preview",
        banner: "Template preview · default content",
        navigation: "Preview navigation",
        footerDescription: "Default template content. Create a draft to customize it.",
        footerNavigation: "Preview footer navigation",
      };
}

function premiumTemplateId(templateId: string, version: string): string | undefined {
  const premiumVersions: Readonly<Record<string, string>> = {
    "com.matrouh.engineer": "2.0.0",
    "com.matrouh.doctor": "2.0.0",
    "com.matrouh.clinic": "2.0.0",
  };
  return premiumVersions[templateId] === version ? templateId : undefined;
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
  return [
    {
      id: typeof node.id === "string" ? node.id : node.pageId,
      href: routeForPage(snapshot, node.pageId, locale),
      label: navigationLabel(node.label, locale),
    },
  ];
}

function navigationLabel(value: unknown, locale: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Page";
  const labels = value as Record<string, unknown>;
  const label = labels[locale] ?? Object.values(labels).find((item) => typeof item === "string");
  return typeof label === "string" ? label : "Page";
}

function localeLabel(locale: string): string {
  if (locale.toLowerCase().startsWith("ar")) return "العربية";
  if (locale.toLowerCase().startsWith("en")) return "English";
  return locale;
}

function routeForPage(snapshot: PublicationSnapshot, pageId: string, locale: string): string {
  return localizedPageRoute(snapshot, pageId, locale) ?? "/";
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
