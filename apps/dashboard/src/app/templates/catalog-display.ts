import type { TemplateCatalogItem } from "@/server/template-catalog";

export function formatCatalogPrice(catalog: TemplateCatalogItem["catalog"]): string {
  try {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: catalog.currency,
      minimumFractionDigits: catalog.priceMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(catalog.priceMinor / 100);
  } catch {
    return `${(catalog.priceMinor / 100).toFixed(2)} ${catalog.currency}`;
  }
}

export function catalogBillingLabel(period: string): string {
  switch (period) {
    case "month":
      return "per month";
    case "year":
      return "per year";
    case "one-time":
      return "one-time";
    default:
      return "custom period";
  }
}

export function templateListingId(templateId: string): string {
  return `listing-${templateId.replace(/[^a-z0-9_-]/gi, "-")}`;
}
