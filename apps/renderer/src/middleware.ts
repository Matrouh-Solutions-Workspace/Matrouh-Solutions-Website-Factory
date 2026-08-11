import { NextResponse, type NextRequest } from "next/server";

const platformHost = new URL(process.env.FACTORY_DASHBOARD_PUBLIC_URL ?? "http://localhost:3000")
  .hostname;

/**
 * Production serves the platform landing page directly from the renderer.
 * Persist its route locale here so following the Control Portal link keeps
 * the same language without putting locale state in the URL.
 */
export function middleware(request: NextRequest): NextResponse {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (host !== platformHost) return NextResponse.next();

  const locale = landingLocale(request.nextUrl.pathname);
  if (!locale) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set("factory_ui_locale", locale, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

function landingLocale(pathname: string): "ar" | "en" | null {
  if (pathname === "/matrouh-solutions") return "ar";
  if (pathname === "/en/matrouh-solutions") return "en";
  return null;
}

export const config = {
  matcher: ["/matrouh-solutions", "/en/matrouh-solutions"],
};
