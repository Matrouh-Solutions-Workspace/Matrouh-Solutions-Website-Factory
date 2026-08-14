import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { EcommerceStorefront } from "../../../../../renderer/src/app/ecommerce-storefront";
import { loadPublicEcommerceStorefront } from "@/server/ecommerce-public";

interface StorefrontPageProperties {
  readonly params: Promise<{ readonly path?: string[] }>;
  readonly searchParams: Promise<{ readonly lang?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: StorefrontPageProperties): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-factory-site-host") ?? requestHeaders.get("host") ?? "";
  const store = await loadPublicEcommerceStorefront(host, (await searchParams).lang);
  if (!store) return { robots: { index: false, follow: false } };
  const { path = [] } = await params;
  const product =
    path[0] === "products" ? store.products.find((item) => item.slug === path[1]) : undefined;
  return {
    title: product ? `${product.name} · ${store.name}` : store.name,
    description: product?.shortDescription || store.description,
    robots: { index: true, follow: true },
  };
}

export default async function StorefrontPage({ params, searchParams }: StorefrontPageProperties) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-factory-site-host") ?? requestHeaders.get("host") ?? "";
  const store = await loadPublicEcommerceStorefront(host, (await searchParams).lang);
  if (!store) notFound();
  const { path = [] } = await params;
  return (
    <>
      <link href="/commerce-storefront.css" rel="stylesheet" />
      <EcommerceStorefront path={path} store={store} />
    </>
  );
}
