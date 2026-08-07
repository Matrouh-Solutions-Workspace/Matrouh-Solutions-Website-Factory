export function mediaStorageKey(input: {
  readonly organizationId: string;
  readonly assetId: string;
  readonly contentHash: string;
  readonly extension: string;
}): string {
  return `media/${input.organizationId}/${input.contentHash}-${input.assetId}.${input.extension}`;
}
