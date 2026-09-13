import { describe, expect, it } from "vitest";
import {
  filterCatalog,
  productAttribute,
  productPrice,
  type CatalogFilters,
} from "../src/app/storefront/catalog";

const products = [
  {
    id: "a",
    slug: "a",
    name: "Alpha",
    shortDescription: "",
    description: "",
    priceMinor: 200,
    salePriceMinor: null,
    currency: "EGP",
    sku: "A",
    attributes: { brand: "One", featured: "true" },
    images: [],
    variants: [
      { id: "av", title: "", sku: null, priceMinor: null, salePriceMinor: null, stockQuantity: 1 },
    ],
    categoryIds: ["care"],
  },
  {
    id: "b",
    slug: "b",
    name: "Beta",
    shortDescription: "",
    description: "",
    priceMinor: 100,
    salePriceMinor: 80,
    currency: "EGP",
    sku: "B",
    attributes: { brand: "Two" },
    images: [],
    variants: [
      { id: "bv", title: "", sku: null, priceMinor: null, salePriceMinor: null, stockQuantity: 0 },
    ],
    categoryIds: ["care"],
  },
] as const;

describe("filterCatalog", () => {
  const filters: CatalogFilters = {
    locale: "en",
    category: "",
    brand: "",
    query: "",
    maxPrice: 500,
    inStockOnly: false,
    saleOnly: false,
    sort: "featured",
  };

  it("filters stock and sale products, then sorts by effective price", () => {
    expect(
      filterCatalog(products, {
        locale: "en",
        category: "care",
        brand: "",
        query: "",
        maxPrice: 500,
        inStockOnly: true,
        saleOnly: false,
        sort: "price-low",
      }).map((product) => product.id),
    ).toEqual(["a"]);
    expect(
      filterCatalog(products, {
        locale: "en",
        category: "",
        brand: "",
        query: "",
        maxPrice: 500,
        inStockOnly: false,
        saleOnly: true,
        sort: "price-low",
      }).map((product) => product.id),
    ).toEqual(["b"]);
  });

  it("supports every catalog filter", () => {
    expect(filterCatalog(products, { ...filters, category: "missing" })).toEqual([]);
    expect(filterCatalog(products, { ...filters, brand: "Two" }).map((product) => product.id)).toEqual([
      "b",
    ]);
    expect(filterCatalog(products, { ...filters, query: "beta" }).map((product) => product.id)).toEqual([
      "b",
    ]);
    expect(filterCatalog(products, { ...filters, maxPrice: 90 }).map((product) => product.id)).toEqual([
      "b",
    ]);
  });

  it("supports every catalog ordering", () => {
    expect(filterCatalog(products, { ...filters, sort: "featured" }).map((product) => product.id)).toEqual([
      "a",
      "b",
    ]);
    expect(filterCatalog(products, { ...filters, sort: "price-high" }).map((product) => product.id)).toEqual([
      "a",
      "b",
    ]);
    expect(filterCatalog(products, { ...filters, sort: "name" }).map((product) => product.id)).toEqual([
      "a",
      "b",
    ]);
    expect(filterCatalog(products, { ...filters, sort: "newest" }).map((product) => product.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("resolves effective prices and safe attributes", () => {
    expect(productPrice(products[0])).toBe(200);
    expect(productPrice(products[1])).toBe(80);
    expect(productAttribute(products[0], "brand")).toBe("One");
    expect(productAttribute({ ...products[0], attributes: { count: 2 } }, "count")).toBe("");
  });
});
