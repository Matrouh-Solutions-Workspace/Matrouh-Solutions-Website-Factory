import type { CSSProperties } from "react";
import type { StorefrontProduct } from "../../server/ecommerce-store";

export type StorefrontKind = "fashion" | "hardware" | "pc";
export function storefrontKind(rendererKey: string): StorefrontKind {
  const key = rendererKey.toLowerCase();
  if (key.includes("pc") || key.includes("component")) return "pc";
  return key.includes("hardware") ? "hardware" : "fashion";
}
export function productPrice(product: StorefrontProduct): number {
  return product.salePriceMinor ?? product.priceMinor;
}
export function unitPrice(
  product: StorefrontProduct,
  variant: StorefrontProduct["variants"][number],
): number {
  return (
    variant.salePriceMinor ?? variant.priceMinor ?? product.salePriceMinor ?? product.priceMinor
  );
}
export function attribute(product: StorefrontProduct, key: string): string {
  const value = product.attributes[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}
export function mediaUrl(organizationId: string, storageKey: string): string {
  const filename = storageKey.split("/").at(-1) ?? "";
  return `/factory-media/${organizationId}/${encodeURIComponent(filename)}`;
}
export function presentationTokens(value: Readonly<Record<string, unknown>>): CSSProperties {
  const raw =
    value.tokens && typeof value.tokens === "object" && !Array.isArray(value.tokens)
      ? (value.tokens as Record<string, unknown>)
      : {};
  return {
    "--commerce-primary": typeof raw.primary === "string" ? raw.primary : "#171512",
    "--commerce-accent": typeof raw.accent === "string" ? raw.accent : "#a45f3f",
    "--commerce-surface": typeof raw.surface === "string" ? raw.surface : "#f8f6f1",
    "--commerce-radius": typeof raw.radius === "string" ? raw.radius : "18px",
  } as CSSProperties;
}
