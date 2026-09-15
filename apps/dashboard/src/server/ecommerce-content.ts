export const ecommerceContentFields = [
  "announcementFashion",
  "announcementHardware",
  "fashionHeroEyebrow",
  "fashionHeroTitle",
  "fashionHeroBody",
  "fashionHeroEyebrow2",
  "fashionHeroTitle2",
  "fashionHeroBody2",
  "hardwareHeroEyebrow",
  "hardwareHeroTitle",
  "hardwareHeroBody",
  "hardwareHeroEyebrow2",
  "hardwareHeroTitle2",
  "hardwareHeroBody2",
  "shopNow",
  "exploreCategories",
  "editorialEyebrow",
  "editorialTitle",
  "editorialText",
  "catalog",
  "allProducts",
  "catalogFashionText",
  "catalogHardwareText",
] as const;

export type EcommerceContentField = (typeof ecommerceContentFields)[number];

export function ecommerceContentDefaults(locale: "en" | "ar", kind: "fashion" | "hardware") {
  if (locale === "ar") {
    return kind === "fashion"
      ? {
          announcementFashion: "توصيل مجاني فوق ١٬٥٠٠ ج.م · استبدال سهل",
          fashionHeroEyebrow: "ستايلات جديدة · أسعار مناسبة · مقاسات أسهل",
          fashionHeroTitle: "البس ما يشبهك.",
          fashionHeroBody:
            "متجر مرن للأساسيات اليومية والترندات والملابس المحتشمة وملابس العمل والأطفال وكل ما بينها.",
          fashionHeroEyebrow2: "جديد كل أسبوع",
          fashionHeroTitle2: "ملابس مصممة للحياة اليومية.",
          fashionHeroBody2:
            "تسوق سهل وأسعار واضحة وإرشادات مفيدة للمقاسات وإطلالات يختارها كل عميل بطريقته.",
          shopNow: "تسوق الجديد",
          exploreCategories: "استكشف الأقسام",
          editorialEyebrow: "مصمم لتجارة الملابس اليومية",
          editorialTitle: "متجر واحد لكل أنواع الملابس.",
          editorialText:
            "اعرض الجديد والأساسيات الاقتصادية والترندات والملابس المحتشمة والزي الموحد ومجموعات العائلة بنفس تجربة التسوق السهلة.",
          catalog: "كل المنتجات",
          allProducts: "اعثر على المقاس والسعر المناسب",
          catalogFashionText:
            "نظّم الأساسيات والكاجوال وملابس العمل والأطفال والأحذية والإكسسوارات والمواسم في متجر واحد واضح.",
        }
      : {
          announcementHardware: "أسعار للمحترفين واستلام في نفس اليوم",
          hardwareHeroEyebrow: "قوة احترافية · صُنعت لتدوم",
          hardwareHeroTitle: "الأداة الصحيحة تغيّر المهمة.",
          hardwareHeroBody:
            "أدوات بمستوى الورش ومواصفات موثقة ودعم خبير للمحترفين وصنّاع المشاريع.",
          hardwareHeroEyebrow2: "جاهز للمشروع",
          hardwareHeroTitle2: "ابنِ بذكاء. أنهِ بقوة.",
          hardwareHeroBody2: "معدات موثوقة وملحقات أصلية مختارة للأداء من أول قطعية إلى آخر تثبيت.",
          shopNow: "تسوق كل الأدوات",
          exploreCategories: "استكشف الأقسام",
          editorialEyebrow: "ملاحظات الورشة · ٠٨",
          editorialTitle: "اختر النظام، لا الأداة فقط.",
          editorialText: "معدات موثوقة وملحقات أصلية ومواصفات واضحة تساعدك على إنجاز العمل بثقة.",
          catalog: "كل المنتجات",
          allProducts: "اعثر على الأداة المناسبة",
          catalogHardwareText:
            "ابدأ بالمهمة، اختر القسم، قارن المواصفات الأساسية، ثم عد إلى العمل.",
        };
  }
  return kind === "fashion"
    ? {
        announcementFashion: "Free delivery over EGP 1,500 · Easy exchanges",
        fashionHeroEyebrow: "New styles · Fair prices · Easy fits",
        fashionHeroTitle: "Wear what feels like you.",
        fashionHeroBody:
          "A flexible shop for everyday basics, fresh trends, modest layers, workwear, kidswear, and everything in between.",
        fashionHeroEyebrow2: "Fresh drops every week",
        fashionHeroTitle2: "Outfits made for real life.",
        fashionHeroBody2:
          "Easy-to-shop clothing, clear prices, useful size guidance, and looks your customers can make their own.",
        shopNow: "Shop new arrivals",
        exploreCategories: "Explore categories",
        editorialEyebrow: "Built for everyday retail",
        editorialTitle: "One shop. Every kind of wardrobe.",
        editorialText:
          "Promote new arrivals, affordable basics, trend-led pieces, modest fashion, uniforms, or family collections without changing the shopping experience.",
        catalog: "Everything in store",
        allProducts: "Find the right style, size, and price",
        catalogFashionText:
          "Organize basics, casualwear, work looks, kidswear, shoes, accessories, and seasonal drops in one clear storefront.",
      }
    : {
        announcementHardware: "Trade pricing and same-day pickup available",
        hardwareHeroEyebrow: "Professional power · Built to last",
        hardwareHeroTitle: "The right tool changes the job.",
        hardwareHeroBody:
          "Workshop-grade tools, verified specifications, and expert support for professionals and serious makers.",
        hardwareHeroEyebrow2: "Project ready",
        hardwareHeroTitle2: "Build smarter. Finish stronger.",
        hardwareHeroBody2:
          "Reliable hardware and genuine accessories, selected for performance from first cut to final fix.",
        shopNow: "Shop all tools",
        exploreCategories: "Explore categories",
        editorialEyebrow: "Workshop notes · No. 08",
        editorialTitle: "Choose the system, not just the tool.",
        editorialText:
          "Reliable hardware and genuine accessories, selected for performance from first cut to final fix.",
        catalog: "Everything in store",
        allProducts: "Find the right tool",
        catalogHardwareText:
          "Start with the job. Find the right category, compare key specs, and get back to building.",
      };
}

export function ecommerceContentOverrides(
  settings: unknown,
  locale: "en" | "ar",
): Record<string, string> {
  const root = record(settings);
  const content = record(root.content);
  const localized = record(content[locale]);
  return Object.fromEntries(
    Object.entries(localized).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== "",
    ),
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
