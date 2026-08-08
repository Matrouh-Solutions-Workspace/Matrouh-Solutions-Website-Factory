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
  const authorization = await dashboardOidcClient().authorizationUrl({
    state,
    nonce,
    codeChallenge: await pkceChallenge(verifier),
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
  return response;
}
