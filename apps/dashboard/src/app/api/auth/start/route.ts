import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pkceChallenge } from "@factory/auth";
import { enforceRateLimit } from "@factory/database";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";
import { dashboardOidcClient } from "@/server/oidc";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  if (dashboardConfig.FACTORY_AUTH_MODE !== "oidc") {
    return NextResponse.redirect(
      new URL("/dashboard/login?error=unavailable", dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL),
    );
  }
  const clientAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  await enforceRateLimit(dashboardDatabase(), `oidc-start:${clientAddress}`, 10, 60);
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const uiLocales =
    preferredUiLocale(request.nextUrl.searchParams.get("locale")) ??
    preferredUiLocale(request.cookies.get("factory_ui_locale")?.value) ??
    preferredUiLocale(request.headers.get("accept-language")) ??
    "ar";
  const authorization = await dashboardOidcClient().authorizationUrl({
    state,
    nonce,
    codeChallenge: await pkceChallenge(verifier),
    ...(uiLocales ? { uiLocales } : {}),
  });
  const response = NextResponse.redirect(authorization);
  const options = {
    httpOnly: true,
    secure: dashboardConfig.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/callback",
    maxAge: 10 * 60,
  };
  response.cookies.set("factory_oidc_state", state, options);
  response.cookies.set("factory_oidc_nonce", nonce, options);
  response.cookies.set("factory_oidc_verifier", verifier, options);
  response.cookies.set("factory_ui_locale", uiLocales, {
    httpOnly: true,
    secure: dashboardConfig.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  if (next) response.cookies.set("factory_oidc_next", next, options);
  return response;
}

function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function preferredUiLocale(value: string | null | undefined): "ar" | "en" | undefined {
  const locales = (value ?? "")
    .split(",")
    .map((item) => item.trim().split(";", 1)[0]?.toLowerCase())
    .filter((item): item is string => Boolean(item));
  const preferred = locales.find((locale) => locale.startsWith("ar") || locale.startsWith("en"));
  return preferred?.startsWith("ar") ? "ar" : preferred?.startsWith("en") ? "en" : undefined;
}
