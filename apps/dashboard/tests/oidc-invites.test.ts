import { describe, expect, it } from "vitest";
import { verifiedOidcInviteEmail } from "../src/server/oidc-invites";

describe("OIDC client invitation claims", () => {
  it("accepts only a provider-verified email", () => {
    expect(
      verifiedOidcInviteEmail({
        issuer: "https://identity.example.com",
        subject: "client-1",
        email: " Client@Example.COM ",
        emailVerified: true,
      }),
    ).toBe("client@example.com");
  });

  it("rejects unverified, missing, and malformed email claims", () => {
    expect(
      verifiedOidcInviteEmail({
        issuer: "https://identity.example.com",
        subject: "client-1",
        email: "client@example.com",
        emailVerified: false,
      }),
    ).toBeNull();
    expect(
      verifiedOidcInviteEmail({ issuer: "https://identity.example.com", subject: "client-1" }),
    ).toBeNull();
    expect(
      verifiedOidcInviteEmail({
        issuer: "https://identity.example.com",
        subject: "client-1",
        email: "not-an-email",
        emailVerified: true,
      }),
    ).toBeNull();
  });
});
