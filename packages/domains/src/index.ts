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

export type CustomDomainSubdomainMode = "none" | "selected" | "wildcard";
export type DomainRoutingMode = "exact" | "wildcard";

export interface CustomDomainRoute {
  hostname: string;
  rootHostname: string;
  routingMode: DomainRoutingMode;
  isPrimary: boolean;
}

/** Expands one website-scoped custom-domain configuration into routable hostnames. */
export function customDomainRoutes(input: {
  rootHostname: string;
  includeApex?: boolean;
  includeWww?: boolean;
  subdomainMode?: CustomDomainSubdomainMode;
  selectedSubdomains?: readonly string[];
}): CustomDomainRoute[] {
  const rootHostname = normalizeHostname(input.rootHostname);
  if (rootHostname === "localhost" || rootHostname.endsWith(".localhost")) {
    throw new Error("CUSTOM_DOMAIN_PUBLIC_HOST_REQUIRED");
  }
  const routes = new Map<string, CustomDomainRoute>();
  const add = (hostname: string, routingMode: DomainRoutingMode, isPrimary = false) =>
    routes.set(hostname, { hostname, rootHostname, routingMode, isPrimary });
  if (input.includeApex !== false) add(rootHostname, "exact", true);
  if (input.includeWww !== false) add(`www.${rootHostname}`, "exact", input.includeApex === false);
  const mode = input.subdomainMode ?? "none";
  if (mode === "wildcard") add(`*.${rootHostname}`, "wildcard");
  if (mode === "selected") {
    for (const rawLabel of input.selectedSubdomains ?? []) {
      const label = rawLabel.trim().toLowerCase();
      if (!label || label === "www" || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
        if (label && label !== "www") throw new Error("CUSTOM_DOMAIN_INVALID_SUBDOMAIN");
        continue;
      }
      add(`${label}.${rootHostname}`, "exact");
    }
  }
  if (routes.size === 0) throw new Error("CUSTOM_DOMAIN_ROUTE_REQUIRED");
  return [...routes.values()];
}

/** Exact routes win; wildcard routes match subdomains but never the apex. */
export function customDomainRouteMatches(
  requestedHostname: string,
  route: Pick<CustomDomainRoute, "hostname" | "rootHostname" | "routingMode">,
): boolean {
  const requested = normalizeHostname(requestedHostname);
  return route.routingMode === "exact"
    ? requested === route.hostname
    : requested !== route.rootHostname && requested.endsWith(`.${route.rootHostname}`);
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
