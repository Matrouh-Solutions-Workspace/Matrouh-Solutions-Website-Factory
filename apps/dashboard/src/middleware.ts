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
    const locale = request.cookies.get("factory_ui_locale")?.value === "en" ? "en" : "ar";
    return rendererRewrite(
      request,
      dashboardHost,
      locale === "en" ? "/en/matrouh-solutions" : "/matrouh-solutions",
    );
  }
  if (pathname === "/matrouh-solutions" || pathname.startsWith("/en/matrouh-solutions")) {
    const locale = pathname.startsWith("/en/") ? "en" : "ar";
    const response = rendererRewrite(request, dashboardHost);
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
    return rendererRewrite(request, dashboardHost);
  }
  if (pathname === "/preview" || pathname.startsWith("/preview/")) {
    return rendererRewrite(request, dashboardHost);
  }
  if (pathname === "/template-preview" || pathname.startsWith("/template-preview/")) {
    return rendererRewrite(request, dashboardHost);
  }
  if (pathname === "/templates") {
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
  if (pathname) destination.pathname = pathname;
  const forwarded = new Headers(request.headers);
  forwarded.set("x-factory-site-host", host);
  return NextResponse.rewrite(destination, { request: { headers: forwarded } });
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
