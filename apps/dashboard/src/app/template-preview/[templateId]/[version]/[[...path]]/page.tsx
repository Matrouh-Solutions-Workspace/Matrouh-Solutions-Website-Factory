import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PublicationSnapshot } from "@factory/publication-contract";
import type { ThemeTokens } from "@factory/template-sdk";
import { TemplatePreviewNavigation } from "@/app/template-preview/template-preview-navigation";
import { loadDashboardTemplatePreview } from "@/server/template-preview";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface PreviewProperties {
  readonly params: Promise<{
    readonly templateId: string;
    readonly version: string;
    readonly path?: string[];
  }>;
}

export async function generateMetadata({ params }: PreviewProperties): Promise<Metadata> {
  const { templateId, version, path = [] } = await params;
  const preview = await safePreview(templateId, version, `/${path.join("/")}`);
  const text = previewText(preview?.rendered.locale);
  return {
    title: preview ? `${preview.rendered.title} ${text.titleSuffix}` : text.title,
    robots: { index: false, follow: false, noarchive: true, noimageindex: true },
  };
}

export default async function TemplatePreviewPage({ params }: PreviewProperties) {
  const { templateId, version, path = [] } = await params;
  const pathname = `/${path.join("/")}`;
  const preview = await safePreview(templateId, version, pathname);
  if (!preview) notFound();
  const navigation = navigationLinks(preview.snapshot, preview.rendered.locale);
  const localizedRoutes = localeLinks(preview.snapshot, pathname);
  const appearance = previewAppearance(preview.snapshot);
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
      dir={preview.rendered.locale.toLowerCase().startsWith("ar") ? "rtl" : "ltr"}
      lang={preview.rendered.locale}
      style={themeVariables(preview.snapshot.theme)}
    >
      <aside className="previewBanner">{text.banner}</aside>
      <header className="siteHeader">
        <a className="siteBrand" href={`${preview.prefix}/`}>
          <img alt="" className="siteBrandMark" src="/matrouh-logo.png" />
          <strong>{preview.snapshot.website.name}</strong>
        </a>
        <TemplatePreviewNavigation
          ariaLabel={text.navigation}
          initialAppearance={appearance}
          items={navigation.map((item) => ({
            ...item,
            href: `${preview.prefix}${item.href}`,
          }))}
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
    return await loadDashboardTemplatePreview(templateId, version, pathname);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Failed to load dashboard template preview", {
      templateId,
      version,
      pathname,
      error,
    });
    return null;
  }
}

function isNextRedirect(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { readonly digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT;");
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

function previewAppearance(snapshot: PublicationSnapshot): "dark" | "light" {
  const settings = snapshot.website.settings;
  return settings &&
    typeof settings === "object" &&
    !Array.isArray(settings) &&
    (settings as Record<string, unknown>).colorMode === "dark"
    ? "dark"
    : "light";
}

function textDirection(locale: string): "ltr" | "rtl" {
  return locale.toLowerCase().startsWith("ar") ? "rtl" : "ltr";
}

function localeLinks(snapshot: PublicationSnapshot, pathname: string) {
  const currentRoute = snapshot.routes.find((route) => route.pathname === pathname);
  if (!currentRoute) return [];
  const currentPage = snapshot.pages.find(
    (page) => page.id === currentRoute.pageId && page.locale === currentRoute.locale,
  );
  if (!currentPage) return [];
  return snapshot.locales.flatMap(({ locale }) => {
    const page = snapshot.pages.find(
      (candidate) => candidate.locale === locale && candidate.pageTypeId === currentPage.pageTypeId,
    );
    const route = page
      ? snapshot.routes.find(
          (candidate) => candidate.locale === locale && candidate.pageId === page.id,
        )
      : undefined;
    return route ? [{ locale, href: route.pathname, current: locale === currentRoute.locale }] : [];
  });
}

function routeForPage(snapshot: PublicationSnapshot, pageId: string, locale: string): string {
  const direct = snapshot.routes.find(
    (route) => route.pageId === pageId && route.locale === locale,
  );
  if (direct) return direct.pathname;
  const sourcePage = snapshot.pages.find((page) => page.id === pageId);
  const localizedPage = sourcePage
    ? snapshot.pages.find(
        (page) => page.locale === locale && page.pageTypeId === sourcePage.pageTypeId,
      )
    : null;
  return localizedPage
    ? (snapshot.routes.find((route) => route.pageId === localizedPage.id && route.locale === locale)
        ?.pathname ?? "/")
    : "/";
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
