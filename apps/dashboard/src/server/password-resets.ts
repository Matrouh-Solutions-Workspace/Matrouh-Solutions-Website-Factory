import { createHash, randomBytes, randomUUID } from "node:crypto";
import { withTenantTransaction } from "@factory/database";
import { dashboardConfig } from "./config";
import { dashboardDatabase } from "./database";

export interface ActivePasswordReset {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
}

export async function createPasswordReset(email: string): Promise<void> {
  const user = await dashboardDatabase().user.findUnique({
    where: { normalizedEmail: email },
    select: { id: true, displayName: true, primaryEmail: true },
  });
  if (!user) return;
  const memberships = await dashboardDatabase().$queryRaw<
    { membership_id: string; organization_id: string }[]
  >`SELECT * FROM find_active_membership_for_user(${user.id}::uuid)`;
  const membership = memberships[0];
  if (!membership) return;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const resetUrl = new URL(
    `/dashboard/reset-password/${token}`,
    dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL,
  ).toString();
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: membership.organization_id,
      actorId: user.id,
      correlationId: `password-reset-request:${user.id}`,
    },
    async (transaction) => {
      await transaction.passwordReset.deleteMany({ where: { userId: user.id } });
      await transaction.passwordReset.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organization_id,
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
        },
      });
      await transaction.outboundMessage.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organization_id,
          recipientEmail: user.primaryEmail,
          subject: "Reset your Matrouh Solutions password",
          bodyText: `Hello ${user.displayName},\n\nUse this secure link to set a new password. It expires in one hour:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
          kind: "account.password_reset",
        },
      });
    },
  );
}

export async function findActivePasswordReset(token: string): Promise<ActivePasswordReset | null> {
  if (token.length < 32 || token.length > 128) return null;
  const rows = await dashboardDatabase().$queryRaw<
    { reset_id: string; organization_id: string; user_id: string }[]
  >`SELECT * FROM find_active_password_reset(${hashToken(token)})`;
  const reset = rows[0];
  return reset
    ? { id: reset.reset_id, organizationId: reset.organization_id, userId: reset.user_id }
    : null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
