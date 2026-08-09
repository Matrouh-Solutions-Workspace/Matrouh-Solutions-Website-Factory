export function localHostname(value: string): string | null {
  return hostedHostname(value, "localhost");
}

export function hostedHostname(value: string, hostingDomain: string): string | null {
  const withoutSuffix = value
    .trim()
    .toLowerCase()
    .replace(new RegExp(`\\.${escapeRegExp(hostingDomain)}\\.?$`), "");
  const label = withoutSuffix
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return label ? `${label}.${hostingDomain}` : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isHostnameConflict(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") {
    return false;
  }
  const metadata = "meta" in error ? JSON.stringify(error.meta) : "";
  return metadata.includes("hostname") || metadata.includes("domains_hostname_active_key");
}
