import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withTenantTransaction } from "@factory/database";
import { dashboardDatabase } from "./database";

export const DASHBOARD_SESSION_COOKIE = "factory_dashboard_session";

export interface DashboardContext {
  readonly organization: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly defaultLocale: string;
  };
  readonly actor: { readonly id: string; readonly email: string; readonly displayName: string };
  readonly membershipId: string;
  readonly roleKeys: readonly string[];
  readonly permissions: ReadonlySet<string>;
}

export const getDashboardContext = cache(async (): Promise<DashboardContext | null> => {
  const credential = (await cookies()).get(DASHBOARD_SESSION_COOKIE)?.value;
  return credential ? authenticateDashboardCredential(credential) : null;
});

export async function authenticateDashboardCredential(
  credential: string,
): Promise<DashboardContext | null> {
  const separator = credential.indexOf(".");
  const organizationId = credential.slice(0, separator);
  const token = credential.slice(separator + 1);
  if (
    separator < 1 ||
    !/^[0-9a-f-]{36}$/i.test(organizationId) ||
    token.length < 32 ||
    token.length > 512
  )
    return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await dashboardDatabase().session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.status !== "active"
  )
    return null;
  const membership = await withTenantTransaction(
    dashboardDatabase(),
    { organizationId, actorId: session.userId, correlationId: `authenticate:${session.id}` },
    (transaction) =>
      transaction.membership.findUnique({
        where: { organizationId_userId: { organizationId, userId: session.userId } },
        include: {
          organization: true,
          roles: {
            include: { role: { include: { permissions: { include: { permission: true } } } } },
          },
        },
      }),
  );
  if (!membership || membership.status !== "active" || membership.organization.status !== "active")
    return null;
  const roleKeys = membership.roles.map((item) => item.role.key).sort();
  const permissions = new Set(
    membership.roles.flatMap((item) => item.role.permissions.map((grant) => grant.permission.key)),
  );
  return Object.freeze({
    organization: Object.freeze({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      defaultLocale: membership.organization.defaultLocale,
    }),
    actor: Object.freeze({
      id: session.user.id,
      email: session.user.primaryEmail,
      displayName: session.user.displayName,
    }),
    membershipId: membership.id,
    roleKeys: Object.freeze(roleKeys),
    permissions,
  });
}

export async function requireDashboardContext(permission?: string): Promise<DashboardContext> {
  const context = await getDashboardContext();
  if (!context) redirect("/login");
  const privileged = context.roleKeys.some((role) => role === "owner" || role === "admin");
  if (permission && !privileged && !context.permissions.has(permission))
    throw new DashboardAuthorizationError(permission);
  return context;
}

export class DashboardAuthorizationError extends Error {
  constructor(readonly permission: string) {
    super("FORBIDDEN");
    this.name = "DashboardAuthorizationError";
  }
}
