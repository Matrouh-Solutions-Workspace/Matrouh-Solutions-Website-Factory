import { normalizeHostname } from "@factory/domains";
import type { EcommerceStorefrontData } from "../../../renderer/src/server/ecommerce-store";
import { dashboardDatabase } from "./database";

export async function loadPublicEcommerceStorefront(
  hostname: string,
  locale?: string,
): Promise<EcommerceStorefrontData | null> {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return null;
  const selectedLocale = locale === "ar" || locale === "en" ? locale : null;
  const rows = await dashboardDatabase().$queryRaw<
    { storefront: EcommerceStorefrontData | null }[]
  >`
    SELECT get_ecommerce_storefront(${normalized}, ${selectedLocale}) AS storefront
  `;
  return rows[0]?.storefront ?? null;
}
