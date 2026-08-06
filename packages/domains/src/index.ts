import { domainToASCII } from "node:url";
import { createHash, createHmac } from "node:crypto";
export type DomainState =
  "pending" | "verifying" | "verified" | "connecting" | "active" | "failed" | "disconnected";
export function normalizeHostname(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw || /[\s/@?#\\]/.test(raw) || raw.startsWith("[")) {
    throw new Error("DOMAIN_INVALID_HOSTNAME");
  }
  const withoutPort = /:\d{1,5}$/.test(raw) ? raw.replace(/:\d{1,5}$/, "") : raw;
  if (withoutPort.includes(":")) throw new Error("DOMAIN_INVALID_HOSTNAME");
  const value = withoutPort.replace(/\.$/, "");
  const ascii = domainToASCII(value);
  if (
    !ascii ||
    ascii.length > 253 ||
    (ascii !== "localhost" &&
      ascii
        .split(".")
        .some(
          (label) =>
            !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
        ))
  ) {
    throw new Error("DOMAIN_INVALID_HOSTNAME");
  }
  return ascii;
}
export interface DnsVerifier {
  verify(hostname: string, challenge: string): Promise<boolean>;
}
export interface CertificateProvider {
  connect(hostname: string): Promise<{ bindingId: string; status: string }>;
}

export function domainOwnershipChallenge(domainId: string, secret: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(domainId) || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("DOMAIN_CHALLENGE_INPUT_INVALID");
  }
  return `factory-verification=${createHmac("sha256", secret)
    .update(`domain-ownership:${domainId}`)
    .digest("base64url")}`;
}

export function domainChallengeHash(challenge: string): string {
  return createHash("sha256").update(challenge).digest("hex");
}
