import { NextResponse, type NextRequest } from "next/server";

const dashboardHost = new URL(process.env.FACTORY_DASHBOARD_PUBLIC_URL ?? "http://localhost:3000")
  .hostname;
// The public renderer URL is for browser-facing links. Proxying server traffic through it
// can send the preserved site host back through Cloudflare and create an origin loop.
const rendererBase = new URL(
  process.env.FACTORY_RENDERER_INTERNAL_URL ??
    process.env.FACTORY_RENDERER_PUBLIC_URL ??
    "http://localhost:3001",
);

/**
 * The dashboard remains its own Next application during development, but this gateway gives
 * visitors one public origin: the platform at localhost:3000/dashboard and each site at its
 * own subdomain on port 3000.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const { pathname, search } = request.nextUrl;
  if (host && host !== dashboardHost) {
    if (pathname.startsWith("/api/storefront/")) {
      const forwarded = new Headers(request.headers);
      forwarded.set("x-factory-site-host", host);
      return NextResponse.next({ request: { headers: forwarded } });
    }
    if (
      pathname === "/commerce-storefront.css" ||
      pathname === "/matrouh-logo.png" ||
      pathname.startsWith("/commerce-heroes/")
    ) {
      return rendererProxy(request, host);
    }
    if (
      pathname.startsWith("/factory-media/") ||
      pathname.startsWith("/media/") ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml"
    ) {
      return rendererProxy(request, host);
    }
    if (pathname.startsWith("/_next/")) {
      return request.cookies.get("factory_commerce_zone")?.value === "1"
        ? NextResponse.next()
        : rendererProxy(request, host);
    }
    const acceptsDocument = request.headers.get("accept")?.includes("text/html") ?? false;
    const knownCommerceHost = request.cookies.get("factory_commerce_zone")?.value === "1";
    const commerce =
      acceptsDocument || !knownCommerceHost
        ? await resolvesToCommerceStore(host)
        : knownCommerceHost;
    if (commerce) return rewriteCommerceStorefront(request, host);
    return rendererProxy(request, host);
  }

  if (pathname === "/") {
    const locale = request.cookies.get("factory_ui_locale")?.value === "en" ? "en" : "ar";
    return rendererProxy(
      request,
      dashboardHost,
      locale === "en" ? "/en/matrouh-solutions" : "/matrouh-solutions",
    );
  }
  if (pathname === "/matrouh-solutions" || pathname.startsWith("/en/matrouh-solutions")) {
    const locale = pathname.startsWith("/en/") ? "en" : "ar";
    const response = await rendererProxy(request, dashboardHost);
    response.cookies.set("factory_ui_locale", locale, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }
  if (pathname === "/matrouh-landing-motion.js") {
    return rendererProxy(request, dashboardHost);
  }
  if (pathname === "/template-gallery-motion.js") {
    return rendererProxy(request, dashboardHost);
  }
  if (pathname === "/preview" || pathname.startsWith("/preview/")) {
    return rendererProxy(request, dashboardHost);
  }
  if (pathname === "/template-preview" || pathname.startsWith("/template-preview/")) {
    return rendererProxy(request, dashboardHost);
  }
  if (
    pathname === "/commerce-template-preview" ||
    pathname.startsWith("/commerce-template-preview/")
  ) {
    return rendererProxy(request, dashboardHost);
  }
  if (
    pathname === "/commerce-storefront.css" ||
    pathname === "/matrouh-logo.png" ||
    pathname.startsWith("/commerce-heroes/")
  ) {
    return rendererProxy(request, dashboardHost);
  }
  if (pathname === "/templates") {
    return rendererProxy(request, dashboardHost);
  }
  if (pathname === "/dashboard") return rewriteDashboard(request, "/");
  if (pathname.startsWith("/dashboard/")) return rewriteDashboard(request, pathname.slice(10));

  // Dashboard application routes retain their existing implementation paths internally.
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (pathname.startsWith("/_next/")) {
    const referer = request.headers.get("referer") ?? "";
    return referer.includes("/dashboard")
      ? NextResponse.next()
      : rendererProxy(request, dashboardHost);
  }
  return NextResponse.redirect(new URL(`/dashboard${pathname}${search}`, request.url));
}

function rewriteDashboard(request: NextRequest, pathname: string): NextResponse {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  return NextResponse.rewrite(destination);
}

async function rendererProxy(
  request: NextRequest,
  host: string,
  pathname?: string,
): Promise<NextResponse> {
  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, rendererBase);
  if (pathname) destination.pathname = pathname;
  const forwarded = new Headers(request.headers);
  // Preserve the public site host for canonical URLs and host-bound renderer behavior.
  forwarded.set("host", rendererBase.port ? `${host}:${rendererBase.port}` : host);
  forwarded.set("x-factory-site-host", host);
  const requestInit: RequestInit = {
    method: request.method,
    headers: forwarded,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    requestInit.body = await request.arrayBuffer();
  }
  const upstream = await fetch(destination, requestInit);
  const responseHeaders = new Headers(upstream.headers);
  for (const header of [
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "transfer-encoding",
    "x-middleware-rewrite",
  ]) {
    responseHeaders.delete(header);
  }
  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

async function resolvesToCommerceStore(host: string): Promise<boolean> {
  const destination = new URL("/api/storefront/resolve", rendererBase);
  destination.searchParams.set("host", host);
  try {
    const response = await fetch(destination, { cache: "no-store" });
    if (!response.ok) return false;
    const result = (await response.json()) as { commerce?: unknown };
    return result.commerce === true;
  } catch {
    return false;
  }
}

function rewriteCommerceStorefront(request: NextRequest, host: string): NextResponse {
  const destination = request.nextUrl.clone();
  destination.pathname = `/commerce-site${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
  const forwarded = new Headers(request.headers);
  forwarded.set("x-factory-site-host", host);
  const response = NextResponse.rewrite(destination, { request: { headers: forwarded } });
  response.cookies.set("factory_commerce_zone", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
