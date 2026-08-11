"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { enforceRateLimit, withTenantTransaction } from "@factory/database";
import { verifyPassword } from "@factory/auth";
import {
  DASHBOARD_OIDC_ID_TOKEN_COOKIE,
  DASHBOARD_SESSION_COOKIE,
  getDashboardContext,
} from "@/server/auth";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";
import { dashboardOidcClient } from "@/server/oidc";

export async function loginAction(formData: FormData): Promise<void> {
  if (dashboardConfig.FACTORY_AUTH_MODE !== "demo") redirect("/login?error=unavailable");
  const requestHeaders = await headers();
  const clientAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  await enforceRateLimit(dashboardDatabase(), `login:${clientAddress}`, 10, 60);
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase().slice(0, 320) : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const nextValue = formData.get("next");
  const next =
    typeof nextValue === "string" && nextValue.startsWith("/") && !nextValue.startsWith("//")
      ? nextValue
      : null;
  const user = await dashboardDatabase().user.findUnique({
    where: { normalizedEmail: email },
  });
  if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash))
    redirect("/login?error=invalid");
  const membershipRows = await dashboardDatabase().$queryRaw<
    { membership_id: string; organization_id: string }[]
  >`SELECT * FROM find_active_membership_for_user(${user.id}::uuid)`;
  const membershipKey = membershipRows[0];
  if (!membershipKey) redirect("/login?error=invalid");
  const membership = await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: membershipKey.organization_id,
      actorId: user.id,
      correlationId: `password-membership:${user.id}`,
    },
    (transaction) =>
      transaction.membership.findUnique({
        where: { id: membershipKey.membership_id },
        include: { roles: { include: { role: { select: { key: true } } } } },
      }),
  );
  if (!membership) redirect("/login?error=invalid");

  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1_000);
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: membership.organizationId,
      actorId: user.id,
      correlationId: `password-login:${user.id}`,
    },
    (transaction) =>
      transaction.session.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt,
        },
      }),
  );
  (await cookies()).set(DASHBOARD_SESSION_COOKIE, `${membership.organizationId}.${token}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: dashboardConfig.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  const roleKeys = membership.roles.map((item) => item.role.key);
  const clientOnly =
    roleKeys.includes("client") && !roleKeys.some((role) => role === "owner" || role === "admin");
  redirect(next ? dashboardPublicPath(next) : clientOnly ? "/dashboard/account" : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const credential = cookieStore.get(DASHBOARD_SESSION_COOKIE)?.value;
  const context = await getDashboardContext();
  const token = credential?.slice((credential.indexOf(".") ?? -1) + 1);
  if (context && token && token.length >= 32) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: `logout:${context.actor.id}`,
      },
      async (transaction) => {
        const session = await transaction.session.findUnique({ where: { tokenHash } });
        if (!session || session.userId !== context.actor.id) return;
        await transaction.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            actorType: "user",
            actorId: context.actor.id,
            action: "session.revoked",
            resourceType: "session",
            resourceId: session.id,
            correlationId: `logout:${context.actor.id}`,
            metadataJson: {},
            retentionClass: "security",
          },
        });
      },
    );
  }
  cookieStore.delete(DASHBOARD_SESSION_COOKIE);
  const oidcIdToken = cookieStore.get(DASHBOARD_OIDC_ID_TOKEN_COOKIE)?.value;
  cookieStore.delete(DASHBOARD_OIDC_ID_TOKEN_COOKIE);
  if (dashboardConfig.FACTORY_AUTH_MODE === "oidc") {
    let endSessionUrl: URL | null = null;
    try {
      const postLogoutRedirectUri = new URL(
        "/dashboard/login?loggedOut=1",
        dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL,
      ).toString();
      endSessionUrl = await dashboardOidcClient().endSessionUrl({
        postLogoutRedirectUri,
        ...(oidcIdToken ? { idTokenHint: oidcIdToken } : {}),
      });
    } catch (error) {
      console.error("OIDC logout failed", error);
    }
    if (endSessionUrl) redirect(endSessionUrl.toString());
  }
  redirect("/dashboard/login");
}

function dashboardPublicPath(pathname: string): string {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return pathname;
  return pathname === "/" ? "/dashboard" : `/dashboard${pathname}`;
}
