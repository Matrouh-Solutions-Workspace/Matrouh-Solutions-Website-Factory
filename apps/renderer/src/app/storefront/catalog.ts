import type { StorefrontProduct } from "../../server/ecommerce-store";

export type StorefrontSortKey = "featured" | "newest" | "price-low" | "price-high" | "name";

export interface CatalogFilters {
  readonly locale: "en" | "ar";
  readonly category: string;
  readonly brand: string;
  readonly query: string;
  readonly maxPrice: number;
  readonly inStockOnly: boolean;
  readonly saleOnly: boolean;
  readonly sort: StorefrontSortKey;
}

export function productPrice(product: StorefrontProduct): number {
  return product.salePriceMinor ?? product.priceMinor;
}

export function productAttribute(product: StorefrontProduct, key: string): string {
  const value = product.attributes[key];
  return typeof value === "string" ? value : "";
}

export function filterCatalog(
  products: readonly StorefrontProduct[],
  filters: CatalogFilters,
): readonly StorefrontProduct[] {
  const query = filters.query.trim().toLocaleLowerCase(filters.locale);
  const filtered = products.filter((product) => {
    const searchable = [
      product.name,
      product.description,
      product.shortDescription,
      product.sku,
      ...Object.values(product.attributes),
    ]
      .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
      .join(" ")
      .toLocaleLowerCase(filters.locale);
    return (
      (!filters.category || product.categoryIds.includes(filters.category)) &&
      (!filters.brand || productAttribute(product, "brand") === filters.brand) &&
      (!query || searchable.includes(query)) &&
      productPrice(product) <= filters.maxPrice &&
      (!filters.inStockOnly || product.variants.some((variant) => variant.stockQuantity > 0)) &&
      (!filters.saleOnly || product.salePriceMinor !== null)
    );
  });
  return [...filtered].sort((left, right) => {
    if (filters.sort === "price-low") return productPrice(left) - productPrice(right);
    if (filters.sort === "price-high") return productPrice(right) - productPrice(left);
    if (filters.sort === "name") return left.name.localeCompare(right.name, filters.locale);
    if (filters.sort === "newest") return products.indexOf(left) - products.indexOf(right);
    return Number(productAttribute(right, "featured") === "true") - Number(productAttribute(left, "featured") === "true");
  });
}
