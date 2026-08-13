import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GalleryAppearanceToggle } from "./gallery-controls";
import { rendererConfig } from "@/server/config";
import { loadPublicTemplateCatalog, type PublicTemplateCatalogItem } from "@/server/site";
import {
  MATROUH_EMAIL_URL,
  MATROUH_FACEBOOK_URL,
  MATROUH_WHATSAPP_URL,
} from "../public-contact-links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Website packages and prices | Matrouh Solutions",
  description:
    "Compare Matrouh Solutions website and digital-menu templates, pricing, features, and live previews.",
};

interface TemplatesGalleryProperties {
  readonly searchParams: Promise<{ readonly category?: string; readonly locale?: string }>;
}

export default async function TemplatesGallery({ searchParams }: TemplatesGalleryProperties) {
  await requirePlatformHost();
  const parameters = await searchParams;
  const requestedLocale = parameters.locale;
  const cookieLocale = (await cookies()).get("factory_ui_locale")?.value;
  const locale: "ar" | "en" =
    requestedLocale === "en" || (!requestedLocale && cookieLocale === "en") ? "en" : "ar";
  const templates = (await loadPublicTemplateCatalog()).map((template) => {
    const localized = localizedTemplateMetadata(template.templateId, locale);
    return {
      ...template,
      ...localized,
      category:
        locale === "ar"
          ? template.categoryAr || localized.category || template.category
          : catalogCategoryLabel(template.category),
      categoryKey: catalogCategoryKey(template.category),
    };
  });
  const text = copy[locale];
  const categories = [
    ...new Map(templates.map((template) => [template.categoryKey, template.category])).entries(),
  ];
  const selectedCategory = categories.some(([key]) => key === parameters.category)
    ? parameters.category
    : undefined;
  const visibleTemplates = selectedCategory
    ? templates.filter((template) => template.categoryKey === selectedCategory)
    : templates;
  const languageHref = templateGalleryHref(locale === "ar" ? "en" : "ar", selectedCategory);

  return (
    <main
      className="templateGallery"
      data-theme="light"
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
    >
      <script defer src="/template-gallery-motion.js?v=2" />
      <header className="templateGalleryHeader">
        <a
          className="templateGalleryBrand"
          href={locale === "ar" ? "/matrouh-solutions" : "/en/matrouh-solutions"}
        >
          <img alt="Matrouh Solutions" src="/matrouh-logo.png" />
          <span>Matrouh Solutions</span>
        </a>
        <nav aria-label={text.headerNavigation} className="templateGalleryHeaderNav">
          <a href="#packages">{text.packages}</a>
          <a href="#how-it-works">{text.howItWorks}</a>
        </nav>
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
        <div className="templateGalleryHeroCopy" data-gallery-reveal="hero-copy">
          <p>{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <span>{text.description}</span>
          <a className="templateGalleryHeroAction" href="#packages">
            {text.comparePackages} <span aria-hidden>↓</span>
          </a>
        </div>
        <aside
          className="templateGalleryHeroSummary"
          aria-label={text.catalogSummary}
          data-gallery-reveal="hero-summary"
        >
          <strong>{templates.length}</strong>
          <span>{text.availablePackages}</span>
          <div>
            {categories.slice(0, 4).map(([key, label]) => (
              <small key={key}>{label}</small>
            ))}
          </div>
        </aside>
      </section>

      <section className="templateGalleryCatalogIntro" data-gallery-reveal="section" id="packages">
        <div>
          <p>{text.catalogEyebrow}</p>
          <h2>{text.catalogTitle}</h2>
        </div>
        <span>{text.priceNote}</span>
      </section>

      <nav aria-label={text.categoryNavigation} className="templateGalleryCategoryFilter">
        <span>{text.filterByCategory}</span>
        <div>
          <a
            aria-current={selectedCategory ? undefined : "page"}
            href={templateGalleryHref(locale)}
          >
            {text.allCategories}
            <small>{templates.length}</small>
          </a>
          {categories.map(([key, label]) => (
            <a
              aria-current={selectedCategory === key ? "page" : undefined}
              href={templateGalleryHref(locale, key)}
              key={key}
            >
              {label}
              <small>{templates.filter((template) => template.categoryKey === key).length}</small>
            </a>
          ))}
        </div>
      </nav>

      <section aria-label={text.catalogLabel} className="templateGalleryGrid">
        {visibleTemplates.map((template) => (
          <TemplatePackageCard
            key={`${template.templateId}@${template.version}`}
            locale={locale}
            template={template}
          />
        ))}
      </section>

      {visibleTemplates.length === 0 ? <p className="templateGalleryEmpty">{text.empty}</p> : null}

      <section className="templateGalleryProcess" data-gallery-reveal="section" id="how-it-works">
        <div className="templateGalleryProcessIntro">
          <p>{text.processEyebrow}</p>
          <h2>{text.processTitle}</h2>
        </div>
        <ol>
          {text.steps.map((step, index) => (
            <li data-gallery-reveal="process-item" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="templateGalleryFooter" data-gallery-reveal="section">
        <div>
          <strong>{text.footerTitle}</strong>
          <span>{text.footerDescription}</span>
        </div>
        <nav aria-label={text.contactNavigation}>
          <a href={MATROUH_WHATSAPP_URL} rel="noreferrer" target="_blank">
            WhatsApp
          </a>
          <a href={MATROUH_FACEBOOK_URL} rel="noreferrer" target="_blank">
            Facebook
          </a>
          <a href={MATROUH_EMAIL_URL}>{locale === "ar" ? "البريد الإلكتروني" : "Email"}</a>
        </nav>
      </footer>
    </main>
  );
}

function TemplatePackageCard({
  template,
  locale,
}: {
  readonly template: PublicTemplateCatalogItem;
  readonly locale: "ar" | "en";
}) {
  const text = copy[locale];
  const preview = previewHref(template.templateId, template.version, locale);
  const configuredHighlights = locale === "ar" ? template.highlightsAr : template.highlights;
  const highlights = configuredHighlights.length
    ? configuredHighlights
    : defaultHighlights(template, locale);
  const ctaHref = template.ctaHref ?? MATROUH_WHATSAPP_URL;
  const badge =
    (locale === "ar" ? template.badgeAr : template.badge) ||
    (template.featured ? text.recommended : null);
  const salesDescription =
    (locale === "ar" ? template.salesDescriptionAr : template.salesDescription) ||
    template.description;
  const ctaLabel =
    (locale === "ar" ? template.ctaLabelAr : template.ctaLabel) || text.requestPackage;

  return (
    <article
      className={`templateGalleryCard${template.featured ? " templateGalleryCard--featured" : ""}`}
      data-gallery-reveal="card"
    >
      <div className="templateGalleryVisual">
        {badge ? <span className="templateGalleryBadge">{badge}</span> : null}
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
        <div className="templateGalleryPackageTitle">
          <div>
            <h2>{template.displayName}</h2>
            <p>{salesDescription}</p>
          </div>
          <div className="templateGalleryPrice" aria-label={text.price}>
            <strong>{formatPrice(template.priceMinor, template.currency, locale)}</strong>
            <span>{periodLabel(template.billingPeriod, locale)}</span>
          </div>
        </div>
        <div className="templateGalleryDivider" />
        <span className="templateGalleryIncludes">{text.packageIncludes}</span>
        <ul aria-label={text.features} className="templateGalleryFeatures">
          {highlights.slice(0, 6).map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        <div className="templateGalleryCardActions">
          <a
            className="templateGalleryPrimaryLink"
            href={ctaHref}
            rel={ctaHref.startsWith("https://") ? "noreferrer" : undefined}
            target={ctaHref.startsWith("https://") ? "_blank" : undefined}
          >
            {ctaLabel} <span aria-hidden>↗</span>
          </a>
          <a className="templateGalleryPreviewLink" href={preview}>
            {text.openPreview} <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </article>
  );
}

function defaultHighlights(template: PublicTemplateCatalogItem, locale: "ar" | "en"): string[] {
  const text = copy[locale];
  return [
    text.responsive,
    ...(template.features.includes("localized-content") ? [text.bilingual] : []),
    template.features.includes("digital-menu") ? text.mobileMenu : text.contentDashboard,
    template.supportsDarkMode ? text.darkMode : text.lightOnly,
  ];
}

function formatPrice(priceMinor: number, currency: string, locale: "ar" | "en"): string {
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: priceMinor % 100 === 0 ? 0 : 2,
    }).format(priceMinor / 100);
  } catch {
    return `${(priceMinor / 100).toLocaleString(locale === "ar" ? "ar-EG" : "en-EG")} ${currency}`;
  }
}

function periodLabel(
  period: PublicTemplateCatalogItem["billingPeriod"],
  locale: "ar" | "en",
): string {
  return periodLabels[locale][period];
}

function previewHref(templateId: string, version: string, locale: "ar" | "en"): string {
  const base = `/template-preview/${encodeURIComponent(templateId)}/${encodeURIComponent(version)}`;
  return locale === "ar" ? `${base}/ar` : `${base}/`;
}

function catalogCategoryKey(category: string): string {
  return (
    category
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "other"
  );
}

function catalogCategoryLabel(category: string): string {
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => (word === "and" ? "&" : `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`))
    .join(" ");
}

function templateGalleryHref(locale: "ar" | "en", category?: string): string {
  const parameters = new URLSearchParams({ locale });
  if (category) parameters.set("category", category);
  return `/templates?${parameters.toString()}`;
}

function localizedTemplateMetadata(
  templateId: string,
  locale: "ar" | "en",
): Partial<{
  readonly displayName: string;
  readonly description: string;
  readonly category: string;
}> {
  if (locale !== "ar") return {};
  return arabicTemplateMetadata[templateId] ?? {};
}

const periodLabels = {
  ar: { month: "شهرياً", year: "سنوياً", "one-time": "دفعة واحدة", custom: "حسب الاتفاق" },
  en: { month: "per month", year: "per year", "one-time": "one-time", custom: "custom" },
} as const;

const arabicTemplateMetadata: Readonly<
  Record<
    string,
    { readonly displayName: string; readonly description: string; readonly category: string }
  >
> = {
  "com.matrouh.engineer": {
    displayName: "ملف مهندس",
    description: "قالب ثنائي اللغة للمهندسين المستقلين والاستوديوهات التقنية.",
    category: "خدمات احترافية",
  },
  "com.matrouh.doctor": {
    displayName: "عيادة طبية",
    description: "قالب طبي يركز على الثقة للعيادات والأطباء وفرق الرعاية.",
    category: "رعاية صحية",
  },
  "com.matrouh.clinic": {
    displayName: "عيادة متعددة التخصصات",
    description: "قالب عيادة تفاعلي للمواقع والتخصصات وفرق الرعاية.",
    category: "رعاية صحية",
  },
  "com.matrouh.creative": {
    displayName: "ملف إبداعي",
    description: "قالب تحريري للمصممين والمديرين الإبداعيين والمصورين والاستوديوهات.",
    category: "أعمال إبداعية",
  },
  "com.matrouh.food-menu": {
    displayName: "سافرون — قائمة مطعم ومقهى",
    description: "قائمة طعام رقمية احترافية ثنائية اللغة للمطاعم والمقاهي.",
    category: "المطاعم والمقاهي",
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
    headerNavigation: "التنقل الرئيسي",
    packages: "الباقات",
    howItWorks: "كيف نعمل",
    eyebrow: "كتالوج Matrouh Solutions",
    title: "اختر موقعك. اعرف السعر. وابدأ بثقة.",
    description:
      "باقات مواقع وقوائم رقمية جاهزة للتخصيص، مع تصميم احترافي ولوحة تحكم وتجربة عربية وإنجليزية.",
    comparePackages: "قارن الباقات",
    catalogSummary: "ملخص الكتالوج",
    availablePackages: "باقات متاحة الآن",
    catalogEyebrow: "الباقات والأسعار",
    catalogTitle: "حل واضح لكل نوع من الأعمال.",
    priceNote: "الأسعار المعروضة قابلة للتعديل حسب نطاق المشروع والخدمات الإضافية.",
    catalogLabel: "كتالوج القوالب والأسعار",
    categoryNavigation: "تصفية القوالب حسب التصنيف",
    filterByCategory: "تصفح حسب التصنيف",
    allCategories: "كل التصنيفات",
    preview: "معاينة",
    price: "السعر",
    features: "مزايا الباقة",
    packageIncludes: "تتضمن الباقة",
    bilingual: "العربية والإنجليزية",
    darkMode: "الوضع الفاتح والداكن",
    lightOnly: "تصميم فاتح مخصص",
    mobileMenu: "قائمة مصممة للهواتف أولاً",
    contentDashboard: "لوحة تحكم سهلة للمحتوى",
    responsive: "تصميم متجاوب مع جميع الشاشات",
    recommended: "موصى به",
    requestPackage: "اطلب هذه الباقة",
    openPreview: "المعاينة المباشرة",
    empty: "لا توجد باقات متاحة حالياً.",
    processEyebrow: "من الاختيار إلى الإطلاق",
    processTitle: "رحلة بسيطة، ونتيجة احترافية.",
    steps: [
      { title: "اختر الباقة", description: "قارن التصميم والسعر والمزايا المناسبة لنشاطك." },
      { title: "نخصص المحتوى", description: "نضيف هويتك وصورك ومحتواك بالعربية والإنجليزية." },
      { title: "نراجع ونطلق", description: "راجع المعاينة ثم انشر موقعك على نطاقك." },
    ],
    footerTitle: "تحتاج مساعدة في الاختيار؟",
    footerDescription: "تواصل معنا وسنقترح الباقة الأنسب لنشاطك وميزانيتك.",
    contactNavigation: "روابط التواصل",
  },
  en: {
    headerNavigation: "Primary navigation",
    packages: "Packages",
    howItWorks: "How it works",
    eyebrow: "Matrouh Solutions catalog",
    title: "Choose your website. Know the price. Launch with confidence.",
    description:
      "Customizable website and digital-menu packages with professional design, an easy dashboard, and Arabic and English support.",
    comparePackages: "Compare packages",
    catalogSummary: "Catalog summary",
    availablePackages: "packages available now",
    catalogEyebrow: "Packages and pricing",
    catalogTitle: "A clear solution for every kind of business.",
    priceNote: "Displayed prices can change with project scope and optional services.",
    catalogLabel: "Template packages and prices",
    categoryNavigation: "Filter templates by category",
    filterByCategory: "Browse by category",
    allCategories: "All categories",
    preview: "preview",
    price: "price",
    features: "Package features",
    packageIncludes: "Package includes",
    bilingual: "Arabic and English",
    darkMode: "Light and dark mode",
    lightOnly: "Purpose-built light design",
    mobileMenu: "Mobile-first digital menu",
    contentDashboard: "Easy content dashboard",
    responsive: "Responsive across all screen sizes",
    recommended: "Recommended",
    requestPackage: "Request this package",
    openPreview: "Live preview",
    empty: "No packages are available right now.",
    processEyebrow: "From selection to launch",
    processTitle: "A simple journey to a professional result.",
    steps: [
      {
        title: "Choose a package",
        description: "Compare the design, price, and benefits that fit your business.",
      },
      {
        title: "We tailor the content",
        description: "We add your brand, images, and Arabic and English content.",
      },
      {
        title: "Review and launch",
        description: "Approve the live preview, then publish on your domain.",
      },
    ],
    footerTitle: "Need help choosing?",
    footerDescription:
      "Tell us about your business and budget, and we will recommend the right package.",
    contactNavigation: "Contact links",
  },
} as const;
