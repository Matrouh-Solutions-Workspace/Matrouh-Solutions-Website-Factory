"use server";

import { randomUUID } from "node:crypto";
import { hashPassword } from "@factory/auth";
import { withTenantTransaction } from "@factory/database";
import { redirect } from "next/navigation";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";
import { OidcAdminError, updateOidcPassword } from "@/server/oidc-admin";
import { findActivePasswordReset } from "@/server/password-resets";

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const token = textField(formData, "token", 128);
  const password = textField(formData, "password", 256);
  const confirmPassword = textField(formData, "confirmPassword", 256);
  if (password.length < 10 || password !== confirmPassword) {
    redirect(`/reset-password/${token}?error=password`);
  }
  const reset = await findActivePasswordReset(token);
  if (!reset) redirect(`/reset-password/${token}?error=invalid`);
  try {
    const identity = await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: reset.organizationId,
        actorId: reset.userId,
        correlationId: `password-reset-identity:${reset.id}`,
      },
      (transaction) =>
        transaction.authIdentity.findFirst({
          where: {
            userId: reset.userId,
            ...(dashboardConfig.FACTORY_AUTH_MODE === "oidc"
              ? { providerKey: dashboardConfig.FACTORY_OIDC_ISSUER! }
              : {}),
          },
          select: { providerSubject: true },
        }),
    );
    if (dashboardConfig.FACTORY_AUTH_MODE === "oidc") {
      if (!identity) redirect(`/reset-password/${token}?error=invalid`);
      await updateOidcPassword(identity.providerSubject, password);
    }
    const completed = await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: reset.organizationId,
        actorId: reset.userId,
        correlationId: `password-reset-complete:${reset.id}`,
      },
      async (transaction) => {
        const consumed = await transaction.passwordReset.updateMany({
          where: {
            id: reset.id,
            userId: reset.userId,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        });
        if (consumed.count !== 1) return false;
        await transaction.user.update({
          where: { id: reset.userId },
          data: { passwordHash: hashPassword(password) },
        });
        await transaction.session.updateMany({
          where: { userId: reset.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: reset.organizationId,
            actorType: "user",
            actorId: reset.userId,
            action: "password.reset",
            resourceType: "user",
            resourceId: reset.userId,
            correlationId: `password-reset-complete:${reset.id}`,
            metadataJson: {},
            retentionClass: "security",
          },
        });
        return true;
      },
    );
    if (!completed) redirect(`/reset-password/${token}?error=invalid`);
  } catch (error) {
    if (error instanceof OidcAdminError) redirect(`/reset-password/${token}?error=provider`);
    throw error;
  }
  redirect("/login?reset=1");
}

function textField(formData: FormData, key: string, maximum: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}
