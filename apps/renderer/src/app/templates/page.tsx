import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GalleryAppearanceToggle } from "./gallery-controls";
import { rendererConfig } from "@/server/config";
import { loadPublicTemplateCatalog } from "@/server/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Templates | Matrouh Solutions",
  description: "Browse the bilingual website templates available from Matrouh Solutions.",
};

interface TemplatesGalleryProperties {
  readonly searchParams: Promise<{ readonly locale?: string }>;
}

export default async function TemplatesGallery({ searchParams }: TemplatesGalleryProperties) {
  await requirePlatformHost();
  const requestedLocale = (await searchParams).locale;
  const cookieLocale = (await cookies()).get("factory_ui_locale")?.value;
  const locale: "ar" | "en" =
    requestedLocale === "en" || (!requestedLocale && cookieLocale === "en") ? "en" : "ar";
  const templates = (await loadPublicTemplateCatalog()).map((template) => ({
    ...template,
    ...localizedTemplateMetadata(template.templateId, locale),
  }));
  const text = copy[locale];
  const languageHref = locale === "ar" ? "/templates?locale=en" : "/templates?locale=ar";

  return (
    <main
      className="templateGallery"
      data-theme="light"
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
    >
      <header className="templateGalleryHeader">
        <a
          className="templateGalleryBrand"
          href={locale === "ar" ? "/matrouh-solutions" : "/en/matrouh-solutions"}
        >
          <img alt="Matrouh Solutions" src="/matrouh-logo.png" />
          <span>Matrouh Solutions</span>
        </a>
        <div className="templateGalleryControls">
          <a
            className="templateGalleryLanguage"
            href={languageHref}
            hrefLang={locale === "ar" ? "en" : "ar"}
          >
            {locale === "ar" ? "English" : "العربية"}
          </a>
          <GalleryAppearanceToggle locale={locale} />
        </div>
      </header>

      <section className="templateGalleryHero">
        <p>{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <span>{text.description}</span>
      </section>

      <section aria-label={text.catalogLabel} className="templateGalleryGrid">
        {templates.map((template) => {
          const preview = previewHref(template.templateId, template.version, locale);
          return (
            <article
              className="templateGalleryCard"
              key={`${template.templateId}@${template.version}`}
            >
              <div className="templateGalleryVisual">
                <iframe
                  loading="lazy"
                  src={preview}
                  tabIndex={-1}
                  title={`${template.displayName} ${text.preview}`}
                />
              </div>
              <div className="templateGalleryCardBody">
                <div className="templateGalleryCardTopline">
                  <span>{template.category}</span>
                  <small>v{template.version}</small>
                </div>
                <h2>{template.displayName}</h2>
                <p>{template.description}</p>
                <ul aria-label={text.features} className="templateGalleryFeatures">
                  <li>{text.bilingual}</li>
                  <li>{text.darkMode}</li>
                </ul>
                <a className="templateGalleryPreviewLink" href={preview}>
                  {text.openPreview} <span aria-hidden>↗</span>
                </a>
              </div>
            </article>
          );
        })}
      </section>

      {templates.length === 0 && <p className="templateGalleryEmpty">{text.empty}</p>}
    </main>
  );
}

function previewHref(templateId: string, version: string, locale: "ar" | "en"): string {
  const base = `/template-preview/${encodeURIComponent(templateId)}/${encodeURIComponent(version)}`;
  return locale === "ar" ? `${base}/ar` : `${base}/`;
}

function localizedTemplateMetadata(templateId: string, locale: "ar" | "en") {
  if (locale !== "ar") return {};
  return arabicTemplateMetadata[templateId] ?? {};
}

const arabicTemplateMetadata: Readonly<
  Record<
    string,
    { readonly displayName: string; readonly description: string; readonly category: string }
  >
> = {
  "com.matrouh.engineer": {
    displayName: "ملف مهندس",
    description: "قالب ثنائي اللغة دقيق للمهندسين المستقلين والاستوديوهات التقنية.",
    category: "خدمات احترافية",
  },
  "com.matrouh.doctor": {
    displayName: "عيادة طبية",
    description: "قالب طبي ثنائي اللغة يركّز على الثقة للعيادات والأطباء وفرق الرعاية.",
    category: "رعاية صحية",
  },
  "com.matrouh.clinic": {
    displayName: "عيادة متعددة التخصصات",
    description: "قالب عيادة تفاعلي متعدد المواقع مع رعاية منسقة وخرائط مباشرة.",
    category: "رعاية صحية",
  },
  "com.matrouh.creative": {
    displayName: "ملف إبداعي",
    description: "قالب تحريري للمصممين والمديرين الإبداعيين والمصورين والاستوديوهات.",
    category: "أعمال إبداعية",
  },
};

async function requirePlatformHost(): Promise<void> {
  const requestHeaders = await headers();
  const requestHost = (
    requestHeaders.get("x-factory-site-host") ??
    requestHeaders.get("host") ??
    ""
  )
    .split(":")[0]
    ?.toLowerCase();
  const platformHost = new URL(rendererConfig.FACTORY_DASHBOARD_PUBLIC_URL).hostname.toLowerCase();
  if (requestHost !== platformHost) notFound();
}

const copy = {
  ar: {
    eyebrow: "قوالب Matrouh Solutions",
    title: "اختر نقطة انطلاق تليق بأعمالك.",
    description:
      "استعرض تصاميمنا الجاهزة، ثم افتح المعاينة لتجربة العربية والإنجليزية والوضع الداكن بنفسك.",
    catalogLabel: "كتالوج القوالب",
    preview: "معاينة",
    features: "المزايا المتاحة",
    bilingual: "العربية والإنجليزية",
    darkMode: "وضع فاتح وداكن",
    openPreview: "فتح المعاينة",
    empty: "لا توجد قوالب متاحة حاليًا.",
  },
  en: {
    eyebrow: "Matrouh Solutions templates",
    title: "Choose a starting point that fits your business.",
    description:
      "Explore the available designs, then open a preview to try Arabic, English, and dark mode yourself.",
    catalogLabel: "Template catalog",
    preview: "preview",
    features: "Available features",
    bilingual: "Arabic & English",
    darkMode: "Light & dark mode",
    openPreview: "Open preview",
    empty: "No templates are available yet.",
  },
} as const;
