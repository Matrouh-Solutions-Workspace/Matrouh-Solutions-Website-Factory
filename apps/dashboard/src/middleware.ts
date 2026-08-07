import { NextResponse, type NextRequest } from "next/server";

const dashboardHost = new URL(process.env.FACTORY_DASHBOARD_PUBLIC_URL ?? "http://localhost:3000")
  .hostname;
const rendererBase = new URL(process.env.FACTORY_RENDERER_PUBLIC_URL ?? "http://localhost:3001");

/**
 * The dashboard remains its own Next application during development, but this gateway gives
 * visitors one public origin: the platform at localhost:3000/dashboard and each site at its
 * own subdomain on port 3000.
 */
export function middleware(request: NextRequest): NextResponse {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const { pathname, search } = request.nextUrl;
  if (host && host !== dashboardHost) return rendererRewrite(request, host);

  if (pathname === "/") {
    return (request.headers.get("referer") ?? "").includes("/dashboard")
      ? rewriteDashboard(request, "/")
      : rendererRewrite(request, dashboardHost, "/matrouh-solutions");
  }
  if (pathname === "/matrouh-solutions" || pathname.startsWith("/en/matrouh-solutions")) {
    return rendererRewrite(request, dashboardHost);
  }
  if (pathname === "/dashboard") return rewriteDashboard(request, "/");
  if (pathname.startsWith("/dashboard/")) return rewriteDashboard(request, pathname.slice(10));

  // Dashboard application routes retain their existing implementation paths internally.
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (pathname.startsWith("/_next/")) {
    const referer = request.headers.get("referer") ?? "";
    return referer.includes("/dashboard")
      ? NextResponse.next()
      : rendererRewrite(request, dashboardHost);
  }
  return NextResponse.redirect(new URL(`/dashboard${pathname}${search}`, request.url));
}

function rewriteDashboard(request: NextRequest, pathname: string): NextResponse {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  return NextResponse.rewrite(destination);
}

function rendererRewrite(request: NextRequest, host: string, pathname?: string): NextResponse {
  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, rendererBase);
  destination.hostname = host;
  if (pathname) destination.pathname = pathname;
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
