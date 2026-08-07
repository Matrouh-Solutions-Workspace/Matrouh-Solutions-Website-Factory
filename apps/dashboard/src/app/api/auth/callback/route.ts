import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { OidcIdentity } from "@factory/auth";
import { withTenantTransaction } from "@factory/database";
import { DASHBOARD_SESSION_COOKIE } from "@/server/auth";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";
import { verifiedOidcInviteEmail } from "@/server/oidc-invites";
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
    const authIdentity =
      (await loadOidcIdentity(identity.issuer, identity.subject)) ??
      (await claimClientInvitation(identity));
    const membership = authIdentity?.user.memberships[0];
    if (!authIdentity || !membership || authIdentity.user.status !== "active") {
      return loginFailure(request, "unauthorized");
    }
    const token = randomBytes(48).toString("base64url");
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1_000);
    const isClientAccount = await withTenantTransaction(
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
        const roleKeys = membership.roles.map((membershipRole) => membershipRole.role.key);
        return (
          roleKeys.includes("client") &&
          !roleKeys.some((role) => role === "owner" || role === "admin")
        );
      },
    );
    const response = NextResponse.redirect(
      new URL(isClientAccount ? "/account" : "/", request.url),
    );
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

async function loadOidcIdentity(providerKey: string, providerSubject: string) {
  return dashboardDatabase().authIdentity.findUnique({
    where: { providerKey_providerSubject: { providerKey, providerSubject } },
    include: {
      user: {
        include: {
          memberships: {
            where: { status: "active", organization: { status: "active" } },
            orderBy: { createdAt: "asc" },
            take: 1,
            include: { roles: { include: { role: { select: { key: true } } } } },
          },
        },
      },
    },
  });
}

async function claimClientInvitation(identity: OidcIdentity) {
  const normalizedEmail = verifiedOidcInviteEmail(identity);
  if (!normalizedEmail) return null;
  const invitations = await dashboardDatabase().$queryRaw<
    { membership_id: string; organization_id: string }[]
  >`SELECT * FROM find_client_membership_invite(${normalizedEmail})`;
  const invitation = invitations[0];
  if (!invitation) return null;

  const proposedUserId = randomUUID();
  const proposedIdentityId = randomUUID();
  return withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: invitation.organization_id,
      actorId: proposedUserId,
      correlationId: `accept-client-invite:${invitation.membership_id}`,
    },
    async (transaction) => {
      let user = await transaction.user.findUnique({
        where: { normalizedEmail },
        select: { id: true, status: true },
      });
      user ??= await transaction.user.create({
        data: {
          id: proposedUserId,
          displayName: identity.name?.trim().slice(0, 200) || normalizedEmail.split("@")[0]!,
          primaryEmail: normalizedEmail,
          normalizedEmail,
          status: "active",
        },
        select: { id: true, status: true },
      });
      if (user.status !== "active") throw new Error("OIDC_USER_INACTIVE");

      const existingIdentity = await transaction.authIdentity.findUnique({
        where: {
          providerKey_providerSubject: {
            providerKey: identity.issuer,
            providerSubject: identity.subject,
          },
        },
        select: { userId: true },
      });
      if (existingIdentity && existingIdentity.userId !== user.id) {
        throw new Error("OIDC_IDENTITY_CONFLICT");
      }
      if (!existingIdentity) {
        await transaction.authIdentity.create({
          data: {
            id: proposedIdentityId,
            userId: user.id,
            providerKey: identity.issuer,
            providerSubject: identity.subject,
          },
        });
      }

      const claimed = await transaction.membership.updateMany({
        where: {
          id: invitation.membership_id,
          organizationId: invitation.organization_id,
          status: "invited",
          userId: null,
          invitedEmail: { equals: normalizedEmail, mode: "insensitive" },
        },
        data: {
          userId: user.id,
          status: "active",
          invitedEmail: null,
          revision: { increment: 1 },
        },
      });
      if (claimed.count !== 1) throw new Error("OIDC_INVITATION_ALREADY_CLAIMED");
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: invitation.organization_id,
          actorType: "user",
          actorId: user.id,
          action: "client.portal_invitation_accepted",
          resourceType: "membership",
          resourceId: invitation.membership_id,
          correlationId: `accept-client-invite:${invitation.membership_id}`,
          metadataJson: { provider: identity.issuer },
          retentionClass: "security",
        },
      });
      return transaction.authIdentity.findUnique({
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
                include: { roles: { include: { role: { select: { key: true } } } } },
              },
            },
          },
        },
      });
    },
  );
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
