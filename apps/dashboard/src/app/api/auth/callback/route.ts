import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withTenantTransaction } from "@factory/database";
import { DASHBOARD_SESSION_COOKIE } from "@/server/auth";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";
import { dashboardOidcClient } from "@/server/oidc";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("factory_oidc_state")?.value;
  const nonce = request.cookies.get("factory_oidc_nonce")?.value;
  const verifier = request.cookies.get("factory_oidc_verifier")?.value;
  if (!code || !state || !expectedState || state !== expectedState || !nonce || !verifier) {
    return loginFailure(request, "state");
  }
  try {
    const identity = await dashboardOidcClient().exchangeCode({
      code,
      codeVerifier: verifier,
      nonce,
    });
    const authIdentity = await dashboardDatabase().authIdentity.findUnique({
      where: {
        providerKey_providerSubject: {
          providerKey: identity.issuer,
          providerSubject: identity.subject,
        },
      },
      include: {
        user: {
          include: {
            memberships: {
              where: { status: "active", organization: { status: "active" } },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });
    const membership = authIdentity?.user.memberships[0];
    if (!authIdentity || !membership || authIdentity.user.status !== "active") {
      return loginFailure(request, "unauthorized");
    }
    const token = randomBytes(48).toString("base64url");
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1_000);
    await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: membership.organizationId,
        actorId: authIdentity.userId,
        correlationId: `oidc-login:${sessionId}`,
      },
      async (transaction) => {
        await transaction.session.create({
          data: {
            id: sessionId,
            userId: authIdentity.userId,
            tokenHash: createHash("sha256").update(token).digest("hex"),
            expiresAt,
          },
        });
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: membership.organizationId,
            actorType: "user",
            actorId: authIdentity.userId,
            action: "session.created",
            resourceType: "session",
            resourceId: sessionId,
            correlationId: `oidc-login:${sessionId}`,
            metadataJson: { provider: identity.issuer },
            retentionClass: "security",
          },
        });
      },
    );
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(DASHBOARD_SESSION_COOKIE, `${membership.organizationId}.${token}`, {
      httpOnly: true,
      sameSite: "strict",
      secure: dashboardConfig.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
    clearOidcCookies(response);
    return response;
  } catch {
    return loginFailure(request, "provider");
  }
}

function loginFailure(request: NextRequest, reason: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
  clearOidcCookies(response);
  return response;
}

function clearOidcCookies(response: NextResponse): void {
  response.cookies.delete("factory_oidc_state");
  response.cookies.delete("factory_oidc_nonce");
  response.cookies.delete("factory_oidc_verifier");
}
