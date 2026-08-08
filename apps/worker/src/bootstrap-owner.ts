import { createHash, randomUUID } from "node:crypto";
import { createDatabaseClient, withTenantTransaction } from "@factory/database";
import { workerConfig } from "./config";

const email = required("FACTORY_BOOTSTRAP_OWNER_EMAIL").toLowerCase();
const issuer = required("FACTORY_BOOTSTRAP_OWNER_ISSUER");
const subject = required("FACTORY_BOOTSTRAP_OWNER_SUBJECT");
const hostingDomain = required("FACTORY_BOOTSTRAP_HOSTING_DOMAIN").toLowerCase();

if (workerConfig.FACTORY_AUTH_MODE !== "oidc") {
  throw new Error("BOOTSTRAP_REQUIRES_OIDC");
}

const organizationId = stableUuid(`organization:${hostingDomain}`);
const initialUserId = stableUuid(`owner:${email}`);
const membershipId = stableUuid(`membership:${organizationId}:${initialUserId}`);
const roleId = stableUuid(`role:${organizationId}:owner`);
const hostingDomainId = stableUuid(`hosting-domain:${organizationId}:${hostingDomain}`);
const database = createDatabaseClient({ connectionString: workerConfig.DATABASE_URL });

try {
  await database.organization.upsert({
    where: { id: organizationId },
    update: {
      status: "active",
      defaultLocale: "ar",
      name: "Matrouh Solutions",
      slug: "matrouh-solutions",
    },
    create: {
      id: organizationId,
      name: "Matrouh Solutions",
      slug: "matrouh-solutions",
      defaultLocale: "ar",
      planKey: "standard",
      status: "active",
    },
  });

  const owner = await database.user.upsert({
    where: { normalizedEmail: email },
    update: { primaryEmail: email, displayName: "Matrouh Solutions", status: "active" },
    create: {
      id: initialUserId,
      primaryEmail: email,
      normalizedEmail: email,
      displayName: "Matrouh Solutions",
      status: "active",
    },
    select: { id: true },
  });

  const existingIdentity = await database.authIdentity.findUnique({
    where: { providerKey_providerSubject: { providerKey: issuer, providerSubject: subject } },
    select: { userId: true },
  });
  if (existingIdentity && existingIdentity.userId !== owner.id) {
    throw new Error("BOOTSTRAP_IDENTITY_BELONGS_TO_ANOTHER_USER");
  }

  await withTenantTransaction(
    database,
    { organizationId, actorId: owner.id, correlationId: `bootstrap-owner:${email}` },
    async (transaction) => {
      await transaction.membership.upsert({
        where: { organizationId_userId: { organizationId, userId: owner.id } },
        update: { status: "active", invitedEmail: null },
        create: { id: membershipId, organizationId, userId: owner.id, status: "active" },
      });
      await transaction.role.upsert({
        where: { organizationId_key: { organizationId, key: "owner" } },
        update: { name: "Owner", isSystem: true },
        create: { id: roleId, organizationId, key: "owner", name: "Owner", isSystem: true },
      });
      const membership = await transaction.membership.findUniqueOrThrow({
        where: { organizationId_userId: { organizationId, userId: owner.id } },
      });
      const role = await transaction.role.findUniqueOrThrow({
        where: { organizationId_key: { organizationId, key: "owner" } },
      });
      await transaction.membershipRole.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId: role.id } },
        update: {},
        create: { organizationId, membershipId: membership.id, roleId: role.id },
      });
      await transaction.authIdentity.upsert({
        where: { providerKey_providerSubject: { providerKey: issuer, providerSubject: subject } },
        update: {},
        create: {
          id: randomUUID(),
          userId: owner.id,
          providerKey: issuer,
          providerSubject: subject,
        },
      });
      await transaction.hostingDomain.upsert({
        where: {
          organizationId_hostnameNormalized: { organizationId, hostnameNormalized: hostingDomain },
        },
        update: { hostnameDisplay: hostingDomain, isDefault: true },
        create: {
          id: hostingDomainId,
          organizationId,
          hostnameDisplay: hostingDomain,
          hostnameNormalized: hostingDomain,
          isDefault: true,
        },
      });
    },
  );
  console.log(`Bootstrapped ${email} as owner for ${hostingDomain}.`);
} finally {
  await database.$disconnect();
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function stableUuid(input: string): string {
  const chars = createHash("sha256").update(input).digest("hex").slice(0, 32).split("");
  chars[12] = "4";
  const variant = Number.parseInt(chars[16] ?? "8", 16);
  chars[16] = ((variant & 0x3) | 0x8).toString(16);
  return `${chars.slice(0, 8).join("")}-${chars.slice(8, 12).join("")}-${chars
    .slice(12, 16)
    .join("")}-${chars.slice(16, 20).join("")}-${chars.slice(20).join("")}`;
}
