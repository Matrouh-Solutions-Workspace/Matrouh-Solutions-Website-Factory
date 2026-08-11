import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dashboardConfig } from "@/server/config";
import { UI_LOCALE_COOKIE, uiLocale } from "@/server/ui-locale";

export async function POST(request: NextRequest): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const value =
    body && typeof body === "object" && "locale" in body
      ? (body as { locale?: unknown }).locale
      : undefined;
  const locale = uiLocale(typeof value === "string" ? value : undefined);
  const response = NextResponse.json({ locale });
  response.cookies.set(UI_LOCALE_COOKIE, locale, {
    httpOnly: true,
    secure: dashboardConfig.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
