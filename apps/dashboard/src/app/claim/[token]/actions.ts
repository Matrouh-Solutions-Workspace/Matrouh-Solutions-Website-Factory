"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword } from "@factory/auth";
import { withTenantTransaction } from "@factory/database";
import { DASHBOARD_SESSION_COOKIE, getDashboardContext } from "@/server/auth";
import { dashboardConfig } from "@/server/config";
import { dashboardDatabase } from "@/server/database";
import { findWebsiteClaim } from "@/server/website-claims";

export async function claimWebsiteAction(formData: FormData): Promise<void> {
  const token = textField(formData, "token", 128);
  const context = await getDashboardContext();
  if (!context) redirect(`/login?next=${encodeURIComponent(`/claim/${token}`)}`);
  const claim = await findWebsiteClaim(token);
  if (!claim || claim.organizationId !== context.organization.id)
    redirect(`/claim/${token}?error=invalid`);
  if (
    claim.intendedEmail &&
    claim.intendedEmail.toLowerCase() !== context.actor.email.toLowerCase()
  )
    redirect(`/claim/${token}?error=email`);
  await assignClaim(claim, context.actor.id, context.actor.displayName, context.actor.email);
  redirect("/account");
}

export async function registerAndClaimWebsiteAction(formData: FormData): Promise<void> {
  const token = textField(formData, "token", 128);
  const displayName = textField(formData, "displayName", 200);
  const email = textField(formData, "email", 320).toLowerCase();
  const password = textField(formData, "password", 256);
  const claim = await findWebsiteClaim(token);
  if (!claim || !displayName || !email || password.length < 10)
    redirect(`/claim/${token}?error=invalid`);
  if (claim.intendedEmail && claim.intendedEmail.toLowerCase() !== email)
    redirect(`/claim/${token}?error=email`);
  const existing = await dashboardDatabase().user.findUnique({
    where: { normalizedEmail: email },
    select: { id: true },
  });
  if (existing) redirect(`/login?next=${encodeURIComponent(`/claim/${token}`)}`);

  const userId = randomUUID();
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: claim.organizationId,
      actorId: userId,
      correlationId: `register-claim:${claim.claimId}`,
    },
    async (transaction) => {
      await transaction.user.create({
        data: {
          id: userId,
          displayName,
          primaryEmail: email,
          normalizedEmail: email,
          passwordHash: hashPassword(password),
          status: "active",
        },
      });
      const role = await transaction.role.upsert({
        where: { organizationId_key: { organizationId: claim.organizationId, key: "client" } },
        update: {},
        create: {
          id: randomUUID(),
          organizationId: claim.organizationId,
          key: "client",
          name: "Client",
          isSystem: true,
        },
      });
      const membership = await transaction.membership.create({
        data: { id: randomUUID(), organizationId: claim.organizationId, userId, status: "active" },
      });
      await transaction.membershipRole.create({
        data: {
          organizationId: claim.organizationId,
          membershipId: membership.id,
          roleId: role.id,
        },
      });
    },
  );
  await assignClaim(claim, userId, displayName, email);
  await createSession(claim.organizationId, userId);
  redirect("/account");
}

async function assignClaim(
  claim: NonNullable<Awaited<ReturnType<typeof findWebsiteClaim>>>,
  userId: string,
  displayName: string,
  email: string,
) {
  await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: claim.organizationId,
      actorId: userId,
      correlationId: `claim-website:${claim.claimId}`,
    },
    async (transaction) => {
      const existingClient = await transaction.client.findFirst({
        where: {
          organizationId: claim.organizationId,
          contactEmail: { equals: email, mode: "insensitive" },
          archivedAt: null,
        },
      });
      const client =
        existingClient ??
        (await transaction.client.create({
          data: {
            id: randomUUID(),
            organizationId: claim.organizationId,
            name: displayName,
            contactName: displayName,
            contactEmail: email,
          },
        }));
      const membership = await transaction.membership.findFirst({
        where: { organizationId: claim.organizationId, userId, status: "active" },
      });
      if (membership) {
        const clientRole = await transaction.role.upsert({
          where: { organizationId_key: { organizationId: claim.organizationId, key: "client" } },
          update: {},
          create: {
            id: randomUUID(),
            organizationId: claim.organizationId,
            key: "client",
            name: "Client",
            isSystem: true,
          },
        });
        await transaction.membershipRole.upsert({
          where: {
            membershipId_roleId: { membershipId: membership.id, roleId: clientRole.id },
          },
          update: {},
          create: {
            organizationId: claim.organizationId,
            membershipId: membership.id,
            roleId: clientRole.id,
          },
        });
      }
      const assigned = await transaction.website.updateMany({
        where: { organizationId: claim.organizationId, id: claim.websiteId, clientId: null },
        data: { clientId: client.id, revision: { increment: 1 } },
      });
      if (assigned.count !== 1) throw new Error("WEBSITE_ALREADY_CLAIMED");
      await transaction.websiteClaim.update({
        where: { id: claim.claimId },
        data: { status: "claimed", claimedByUserId: userId, claimedAt: new Date() },
      });
    },
  );
}

async function createSession(organizationId: string, userId: string) {
  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1_000);
  await withTenantTransaction(
    dashboardDatabase(),
    { organizationId, actorId: userId, correlationId: `claim-session:${userId}` },
    (transaction) =>
      transaction.session.create({
        data: {
          id: randomUUID(),
          userId,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt,
        },
      }),
  );
  (await cookies()).set(DASHBOARD_SESSION_COOKIE, `${organizationId}.${token}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: dashboardConfig.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

function textField(formData: FormData, key: string, maximum: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}
