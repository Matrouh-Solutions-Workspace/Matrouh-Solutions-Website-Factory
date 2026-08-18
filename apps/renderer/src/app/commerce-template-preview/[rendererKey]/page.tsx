import { notFound } from "next/navigation";
import { EcommerceStorefront } from "@/app/ecommerce-storefront";
import type { EcommerceStorefrontData, StorefrontProduct } from "@/server/ecommerce-store";

interface PreviewPageProperties {
  readonly params: Promise<{
    readonly rendererKey: string;
    readonly path?: readonly string[];
  }>;
  readonly searchParams: Promise<{ readonly lang?: string }>;
}

const supported = new Set(["fashion-store", "hardware-store", "pc-hardware-store"]);

export default async function CommerceTemplatePreviewPage({
  params,
  searchParams,
}: PreviewPageProperties) {
  const { rendererKey, path = [] } = await params;
  if (!supported.has(rendererKey)) notFound();
  const locale = (await searchParams).lang === "ar" ? "ar" : "en";
  return (
    <EcommerceStorefront
      path={path}
      previewBasePath={`/commerce-template-preview/${encodeURIComponent(rendererKey)}`}
      store={previewStore(rendererKey, locale)}
    />
  );
}

function previewStore(rendererKey: string, locale: "en" | "ar"): EcommerceStorefrontData {
  const pc = rendererKey === "pc-hardware-store";
  const fashion = rendererKey === "fashion-store";
  const categoryNames = fashion
    ? locale === "ar"
      ? ["الجديد", "حريمي", "رجالي", "أطفال", "أحذية", "إكسسوارات"]
      : ["New arrivals", "Women", "Men", "Kids", "Shoes", "Accessories"]
    : pc
      ? ["Graphics cards", "Processors", "Motherboards", "Memory", "Cooling", "Displays"]
      : ["Power tools", "Hand tools", "Cutting", "Fasteners", "Paint", "Storage"];
  const productNames = fashion
    ? locale === "ar"
      ? [
          "تيشيرت قطن يومي",
          "جينز بقصة مريحة",
          "فستان مطبوع",
          "قميص كاجوال",
          "سنيكرز يومي",
          "هودي أطفال",
        ]
      : [
          "Everyday cotton tee",
          "Relaxed fit jeans",
          "Printed day dress",
          "Casual overshirt",
          "Everyday sneakers",
          "Kids color hoodie",
        ]
    : pc
      ? [
          "RTX 5070 graphics card",
          "Ryzen 7 processor",
          "B850 gaming motherboard",
          "32GB DDR5 memory",
          "850W modular PSU",
          "360mm liquid cooler",
        ]
      : [
          "18V impact driver",
          "Brushless drill kit",
          "Precision hand-tool set",
          "Circular saw",
          "Laser measure",
          "Modular toolbox",
        ];
  const categories = categoryNames.map((name, index) => ({
    id: `preview-category-${index}`,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    name,
    description: fashion
      ? locale === "ar"
        ? "اختيارات سهلة لمختلف الأيام والمقاسات"
        : "Easy choices for different days, styles, and sizes"
      : pc
        ? "Build-ready components and upgrades"
        : "Professional workshop essentials",
    parentId: null,
  }));
  const products: StorefrontProduct[] = productNames.map((name, index) => ({
    id: `preview-product-${index}`,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    name,
    shortDescription: fashion
      ? locale === "ar"
        ? "خامة مريحة وقصة سهلة للتنسيق بسعر واضح."
        : "Comfortable fabric, an easy-to-style fit, and a clear price."
      : pc
        ? "Clear specifications and verified build compatibility."
        : "Reliable performance with practical technical specifications.",
    description: "Preview catalog product.",
    priceMinor: (index + 2) * (pc ? 329900 : fashion ? 34900 : 119900),
    salePriceMinor: index === 1 ? (index + 2) * (pc ? 289900 : fashion ? 29900 : 99900) : null,
    currency: "EGP",
    sku: `PREVIEW-${index + 1}`,
    attributes: fashion
      ? {
          brand: locale === "ar" ? "ستايل يومي" : "Everyday Label",
          material: locale === "ar" ? "خامة مريحة" : "Comfort fabric",
          badge: index === 0 ? "New" : undefined,
        }
      : pc
        ? {
            brand: ["NVIDIA", "AMD", "ASUS", "Kingston", "Corsair", "Arctic"][index],
            socket: index === 1 ? "AM5" : undefined,
            memory: index === 3 ? "DDR5" : undefined,
            compatibility: "Build verified",
          }
        : {
            brand: "Forge Pro",
            power: index < 2 ? "18V" : undefined,
            compatibility: "Trade standard",
          },
    images: [],
    variants: [
      {
        id: `preview-variant-${index}`,
        title: "Standard",
        sku: `PREVIEW-${index + 1}`,
        priceMinor: null,
        salePriceMinor: null,
        stockQuantity: 12 + index,
      },
    ],
    categoryIds: [categories[index]?.id ?? categories[0]!.id],
  }));
  return {
    organizationId: "preview",
    storeId: `preview-${rendererKey}`,
    websiteId: `preview-${rendererKey}`,
    name: fashion
      ? locale === "ar"
        ? "متجر ستايل يومي"
        : "Everyday Style Store"
      : pc
        ? "Nexus PC"
        : "Forge Supply",
    description: fashion
      ? locale === "ar"
        ? "ملابس سهلة لكل يوم ولكل ستايل."
        : "Easy clothes for every day and every style."
      : pc
        ? "PC components and custom-build expertise."
        : "Tools and hardware for serious work.",
    footerText: fashion
      ? locale === "ar"
        ? "اختيارات أكثر، مقاسات أوضح، وتسوق أسهل."
        : "More choice, clearer sizing, easier shopping."
      : pc
        ? "Better parts. Balanced builds. Expert support."
        : "Reliable tools, genuine stock, practical support.",
    locale,
    defaultLocale: "en",
    currency: "EGP",
    contactEmail: "hello@example.com",
    contactPhone: "+20 100 000 0000",
    branding: {},
    settings: { allowAppearanceToggle: true },
    presentation: {
      defaultTheme: pc ? "dark" : "light",
      tokens: pc
        ? { primary: "#07111f", accent: "#00a8e8", surface: "#0c1421", radius: "12px" }
        : fashion
          ? { primary: "#15263d", accent: "#ef684b", surface: "#fffaf5", radius: "16px" }
          : { primary: "#111619", accent: "#ffb000", surface: "#f4f5f6", radius: "8px" },
    },
    template: { slug: rendererKey, version: "1.0.0", rendererKey },
    categories,
    products,
    paymentMethods: [{ id: "preview-payment", key: "cash_on_delivery", name: "Cash on delivery" }],
    shippingMethods: [
      { id: "preview-shipping", key: "standard", name: "Standard delivery", priceMinor: 7500 },
    ],
  };
}
