export type MissingArtifactDisposition = "delete" | "quarantine";

export function missingArtifactDisposition(websiteReferences: number): MissingArtifactDisposition {
  return websiteReferences > 0 ? "quarantine" : "delete";
}

export function artifactIntegrityMatches(
  catalogHash: string | null,
  discoveredHash: string,
): boolean {
  return catalogHash === null || catalogHash === discoveredHash;
}
