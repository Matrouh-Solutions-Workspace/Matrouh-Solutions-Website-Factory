import { headers } from "next/headers";
import type { MetadataRoute } from "next";
import { listPublicRoutes } from "@/server/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host") ?? "";
  const routes = await listPublicRoutes(host);
  const protocol = host.startsWith("localhost") || host.includes(".localhost") ? "http" : "https";
  return routes.map((route) => ({
    url: `${protocol}://${host}${route}`,
  }));
}
