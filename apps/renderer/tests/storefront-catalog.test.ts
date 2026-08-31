import { describe, expect, it } from "vitest";
import { filterCatalog } from "../src/app/storefront/catalog";

const products = [
  { id: "a", slug: "a", name: "Alpha", shortDescription: "", description: "", priceMinor: 200, salePriceMinor: null, currency: "EGP", sku: "A", attributes: { brand: "One", featured: "true" }, images: [], variants: [{ id: "av", title: "", sku: null, priceMinor: null, salePriceMinor: null, stockQuantity: 1 }], categoryIds: ["care"] },
  { id: "b", slug: "b", name: "Beta", shortDescription: "", description: "", priceMinor: 100, salePriceMinor: 80, currency: "EGP", sku: "B", attributes: { brand: "Two" }, images: [], variants: [{ id: "bv", title: "", sku: null, priceMinor: null, salePriceMinor: null, stockQuantity: 0 }], categoryIds: ["care"] },
] as const;

describe("filterCatalog", () => {
  it("filters stock and sale products, then sorts by effective price", () => {
    expect(filterCatalog(products, { locale: "en", category: "care", brand: "", query: "", maxPrice: 500, inStockOnly: true, saleOnly: false, sort: "price-low" }).map((product) => product.id)).toEqual(["a"]);
    expect(filterCatalog(products, { locale: "en", category: "", brand: "", query: "", maxPrice: 500, inStockOnly: false, saleOnly: true, sort: "price-low" }).map((product) => product.id)).toEqual(["b"]);
  });
});
