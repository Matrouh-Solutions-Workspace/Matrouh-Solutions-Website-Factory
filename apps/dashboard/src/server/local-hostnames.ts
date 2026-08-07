export function localHostname(value: string): string | null {
  const withoutSuffix = value
    .trim()
    .toLowerCase()
    .replace(/\.localhost\.?$/, "");
  const label = withoutSuffix
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return label ? `${label}.localhost` : null;
}

export function isHostnameConflict(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") {
    return false;
  }
  const metadata = "meta" in error ? JSON.stringify(error.meta) : "";
  return metadata.includes("hostname") || metadata.includes("domains_hostname_active_key");
}
