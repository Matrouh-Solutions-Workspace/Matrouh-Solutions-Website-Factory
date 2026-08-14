import { createDatabaseClient, type DatabaseClient } from "@factory/database";
import { normalizeHostname } from "@factory/domains";
import { rendererConfig } from "./config";

export interface StorefrontVariant {
  readonly id: string;
  readonly title: string;
  readonly sku: string | null;
  readonly priceMinor: number | null;
  readonly salePriceMinor: number | null;
  readonly stockQuantity: number;
}

export interface StorefrontProduct {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly priceMinor: number;
  readonly salePriceMinor: number | null;
  readonly currency: string;
  readonly sku: string | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly images: readonly { id: string; filename: string; alt: string; primary: boolean }[];
  readonly variants: readonly StorefrontVariant[];
  readonly categoryIds: readonly string[];
}

export interface EcommerceStorefrontData {
  readonly organizationId: string;
  readonly storeId: string;
  readonly websiteId: string;
  readonly name: string;
  readonly description: string;
  readonly footerText: string;
  readonly locale: "en" | "ar";
  readonly defaultLocale: "en" | "ar";
  readonly currency: string;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly branding: Readonly<Record<string, unknown>>;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly presentation: Readonly<Record<string, unknown>>;
  readonly template: {
    readonly slug: string;
    readonly version: string;
    readonly rendererKey: string;
  };
  readonly categories: readonly {
    id: string;
    slug: string;
    name: string;
    description: string;
    parentId: string | null;
  }[];
  readonly products: readonly StorefrontProduct[];
  readonly paymentMethods: readonly { id: string; key: string; name: string }[];
  readonly shippingMethods: readonly {
    id: string;
    key: string;
    name: string;
    priceMinor: number;
  }[];
}

const shared = globalThis as unknown as { ecommerceRendererDatabase?: DatabaseClient };

function database(): DatabaseClient {
  shared.ecommerceRendererDatabase ??= createDatabaseClient({
    connectionString: rendererConfig.DATABASE_RENDERER_URL ?? rendererConfig.DATABASE_URL,
  });
  return shared.ecommerceRendererDatabase;
}

export async function loadEcommerceStorefront(
  hostname: string,
  locale?: string,
): Promise<EcommerceStorefrontData | null> {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return null;
  const selectedLocale = locale === "ar" || locale === "en" ? locale : null;
  const rows = await database().$queryRaw<{ storefront: EcommerceStorefrontData | null }[]>`
    SELECT get_ecommerce_storefront(${normalized}, ${selectedLocale}) AS storefront
  `;
  return rows[0]?.storefront ?? null;
}
