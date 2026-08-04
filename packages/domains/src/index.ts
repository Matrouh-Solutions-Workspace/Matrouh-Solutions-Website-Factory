import { domainToASCII } from "node:url";
export type DomainState =
  "pending" | "verifying" | "verified" | "connecting" | "active" | "failed" | "disconnected";
export function normalizeHostname(input: string): string {
  const value = input.trim().replace(/\.$/, "").split(":")[0]?.toLowerCase() ?? "";
  const ascii = domainToASCII(value);
  if (!ascii || ascii.length > 253) throw new Error("DOMAIN_INVALID_HOSTNAME");
  return ascii;
}
export interface DnsVerifier {
  verify(hostname: string, challenge: string): Promise<boolean>;
}
export interface CertificateProvider {
  connect(hostname: string): Promise<{ bindingId: string; status: string }>;
}
