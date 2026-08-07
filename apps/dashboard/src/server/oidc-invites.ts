import type { OidcIdentity } from "@factory/auth";

export function verifiedOidcInviteEmail(identity: OidcIdentity): string | null {
  const normalizedEmail = identity.email?.trim().toLowerCase();
  if (
    identity.emailVerified !== true ||
    !normalizedEmail ||
    normalizedEmail.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return null;
  }
  return normalizedEmail;
}
