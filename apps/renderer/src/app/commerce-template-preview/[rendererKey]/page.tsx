import { notFound } from "next/navigation";
import { EcommerceStorefront } from "@/app/ecommerce-storefront";
import type { EcommerceStorefrontData, StorefrontProduct } from "@/server/ecommerce-store";

interface PreviewPageProperties {
  readonly params: Promise<{ readonly rendererKey: string }>;
  readonly searchParams: Promise<{ readonly lang?: string }>;
}

const supported = new Set(["fashion-store", "hardware-store", "pc-hardware-store"]);

export default async function CommerceTemplatePreviewPage({
  params,
  searchParams,
}: PreviewPageProperties) {
  const { rendererKey } = await params;
  if (!supported.has(rendererKey)) notFound();
  const locale = (await searchParams).lang === "ar" ? "ar" : "en";
  return <EcommerceStorefront path={[]} store={previewStore(rendererKey, locale)} />;
}

function previewStore(rendererKey: string, locale: "en" | "ar"): EcommerceStorefrontData {
  const pc = rendererKey === "pc-hardware-store";
  const fashion = rendererKey === "fashion-store";
  const categoryNames = fashion
    ? ["New edit", "Women", "Men", "Accessories", "Occasion", "Essentials"]
    : pc
      ? ["Graphics cards", "Processors", "Motherboards", "Memory", "Cooling", "Displays"]
      : ["Power tools", "Hand tools", "Cutting", "Fasteners", "Paint", "Storage"];
  const productNames = fashion
    ? [
        "Dune linen shirt",
        "Coastal wrap dress",
        "Knit polo",
        "Woven market tote",
        "Sea glass overshirt",
        "Leather sandal",
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
      ? "A considered seasonal selection"
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
      ? "Considered materials with an effortless modern shape."
      : pc
        ? "Clear specifications and verified build compatibility."
        : "Reliable performance with practical technical specifications.",
    description: "Preview catalog product.",
    priceMinor: (index + 2) * (pc ? 329900 : fashion ? 64900 : 119900),
    salePriceMinor: index === 1 ? (index + 2) * (pc ? 289900 : fashion ? 54900 : 99900) : null,
    currency: "EGP",
    sku: `PREVIEW-${index + 1}`,
    attributes: fashion
      ? {
          brand: "Nexus Studio",
          material: "Premium fabric",
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
    name: fashion ? "Maison Preview" : pc ? "Nexus PC" : "Forge Supply",
    description: fashion
      ? "Modern pieces for considered wardrobes."
      : pc
        ? "PC components and custom-build expertise."
        : "Tools and hardware for serious work.",
    footerText: fashion
      ? "Quiet style, lasting quality."
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
          ? { primary: "#171512", accent: "#a45f3f", surface: "#f8f6f1", radius: "18px" }
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
