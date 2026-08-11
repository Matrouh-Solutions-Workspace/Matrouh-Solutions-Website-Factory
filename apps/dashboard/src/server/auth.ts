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
export const DASHBOARD_OIDC_ID_TOKEN_COOKIE = "factory_dashboard_oidc_id_token";

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
    (transaction) =>
      transaction.membership.findUnique({
        where: { organizationId_userId: { organizationId, userId: session.userId } },
        include: {
          organization: true,
          roles: {
            include: {
              role: {
                select: {
                  key: true,
                  permissions: {
                    select: { permission: { select: { key: true } } },
                  },
                },
              },
            },
          },
        },
      }),
  );
  if (!membership || membership.status !== "active" || membership.organization.status !== "active")
    return null;
  const roleKeys = membership.roles.map(({ role }) => role.key).sort();
  const permissions = new Set(
    membership.roles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.key),
    ),
  );
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
    membershipId: membership.id,
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

/** Allows a client to change only a website that is assigned to their email address. */
export async function requireWebsiteMutationContext(
  websiteId: string,
  permission: string,
): Promise<DashboardContext> {
  const context = await getDashboardContext();
  if (!context) redirect("/login");
  const privileged = context.roleKeys.some((role) => role === "owner" || role === "admin");
  if (privileged || context.permissions.has(permission)) return context;
  if (!context.roleKeys.includes("client")) throw new DashboardAuthorizationError(permission);
  const owned = await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: context.organization.id,
      actorId: context.actor.id,
      correlationId: `client-website-access:${websiteId}`,
    },
    (transaction) =>
      transaction.website.count({
        where: {
          id: websiteId,
          organizationId: context.organization.id,
          archivedAt: null,
          client: {
            archivedAt: null,
            contactEmail: { equals: context.actor.email, mode: "insensitive" },
          },
        },
      }),
  );
  if (owned !== 1) throw new DashboardAuthorizationError("client.website");
  return context;
}

export class DashboardAuthorizationError extends Error {
  constructor(readonly permission: string) {
    super("FORBIDDEN");
    this.name = "DashboardAuthorizationError";
  }
}
