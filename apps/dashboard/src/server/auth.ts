import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withTenantTransaction } from "@factory/database";
import {
  dashboardDatabase,
  isRecoverableDatabaseConnectionError,
  resetDashboardDatabase,
} from "./database";

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
  let client = dashboardDatabase();
  const session = await client.session.findUnique({ where: { tokenHash } }).catch(async (error) => {
    if (!isRecoverableDatabaseConnectionError(error)) throw error;
    client = await resetDashboardDatabase();
    return client.session.findUnique({ where: { tokenHash } });
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  const user = await client.user
    .findUnique({ where: { id: session.userId } })
    .catch(async (error) => {
      if (!isRecoverableDatabaseConnectionError(error)) throw error;
      client = await resetDashboardDatabase();
      return client.user.findUnique({ where: { id: session.userId } });
    });
  if (!user || user.status !== "active") return null;
  const membership = await withTenantTransaction(
    client,
    { organizationId, actorId: user.id, correlationId: `authenticate:${session.id}` },
    async (transaction) => {
      const membership = await transaction.membership.findUnique({
        where: { organizationId_userId: { organizationId, userId: session.userId } },
      });
      if (!membership) return null;
      const organization = await transaction.organization.findUnique({
        where: { id: organizationId },
      });
      const membershipRoles = await transaction.membershipRole.findMany({
        where: { organizationId, membershipId: membership.id },
        select: { roleId: true },
      });
      const roleIds = membershipRoles.map((item) => item.roleId);
      const roles = await transaction.role.findMany({
        where: { organizationId, id: { in: roleIds } },
        select: { id: true, key: true },
      });
      const rolePermissions = await transaction.rolePermission.findMany({
        where: { organizationId, roleId: { in: roleIds } },
        select: { permissionId: true },
      });
      const permissions = await transaction.permission.findMany({
        where: { id: { in: rolePermissions.map((item) => item.permissionId) } },
        select: { key: true },
      });
      return { membership, organization, roles, permissions };
    },
  );
  if (
    !membership ||
    membership.membership.status !== "active" ||
    membership.organization?.status !== "active"
  )
    return null;
  const roleKeys = membership.roles.map((role) => role.key).sort();
  const permissions = new Set(membership.permissions.map((permission) => permission.key));
  return Object.freeze({
    organization: Object.freeze({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      defaultLocale: membership.organization.defaultLocale,
    }),
    actor: Object.freeze({
      id: user.id,
      email: user.primaryEmail,
      displayName: user.displayName,
    }),
    membershipId: membership.membership.id,
    roleKeys: Object.freeze(roleKeys),
    permissions,
  });
}

export async function requireDashboardContext(permission?: string): Promise<DashboardContext> {
  const context = await getDashboardContext();
  if (!context) redirect("/login");
  const privileged = context.roleKeys.some((role) => role === "owner" || role === "admin");
  if (permission && !privileged && !context.permissions.has(permission)) {
    if (context.roleKeys.includes("client")) redirect("/account");
    throw new DashboardAuthorizationError(permission);
  }
  return context;
}

export async function requireClientAccountContext(): Promise<DashboardContext> {
  const context = await requireDashboardContext();
  if (!context.roleKeys.includes("client")) throw new DashboardAuthorizationError("client.account");
  return context;
}

export class DashboardAuthorizationError extends Error {
  constructor(readonly permission: string) {
    super("FORBIDDEN");
    this.name = "DashboardAuthorizationError";
  }
}
