"use server";

import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { enforceRateLimit, withTenantTransaction } from "@factory/database";
import {
  authenticateDashboardCredential,
  DASHBOARD_SESSION_COOKIE,
  getDashboardContext,
} from "@/server/auth";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";

export async function loginAction(formData: FormData): Promise<void> {
  if (dashboardConfig.FACTORY_AUTH_MODE !== "demo") redirect("/login?error=unavailable");
  const requestHeaders = await headers();
  const clientAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  await enforceRateLimit(dashboardDatabase(), `login:${clientAddress}`, 10, 60);
  const credential = formData.get("credential");
  if (typeof credential !== "string" || !(await authenticateDashboardCredential(credential.trim())))
    redirect("/login?error=invalid");
  (await cookies()).set(DASHBOARD_SESSION_COOKIE, credential.trim(), {
    httpOnly: true,
    sameSite: "strict",
    secure: dashboardConfig.NODE_ENV === "production",
    path: "/",
  });
  redirect("/");
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
  redirect("/login");
}
