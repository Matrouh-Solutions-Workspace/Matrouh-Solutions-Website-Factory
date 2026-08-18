export type MissingArtifactDisposition = "delete" | "quarantine";

export function missingArtifactDisposition(websiteReferences: number): MissingArtifactDisposition {
  return websiteReferences > 0 ? "quarantine" : "delete";
}

export function artifactNeedsRefresh(catalogHash: string | null, discoveredHash: string): boolean {
  return catalogHash !== null && catalogHash !== discoveredHash;
}

export function artifactRevisionCompatible(
  catalogManifestHash: string | null,
  discoveredManifestHash: string | null,
): boolean {
  return (
    catalogManifestHash !== null &&
    discoveredManifestHash !== null &&
    catalogManifestHash === discoveredManifestHash
  );
}
