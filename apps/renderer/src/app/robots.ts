import { headers } from "next/headers";
import type { MetadataRoute } from "next";
import { loadSite } from "@/server/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-factory-site-host") ?? requestHeaders.get("host") ?? "";
  const site = await loadSite(host);
  if (!site) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${host.startsWith("localhost") || host.includes(".localhost") ? "http" : "https"}://${host}/sitemap.xml`,
  };
}
