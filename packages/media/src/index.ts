export type MediaState =
  "pending_upload" | "quarantined" | "scanning" | "processing" | "ready" | "rejected" | "deleted";
export interface BlobStore {
  createUpload(
    key: string,
    contentType: string,
    maxBytes: number,
  ): Promise<{ url: string; expiresAt: string }>;
  delete(key: string): Promise<void>;
}
export interface MediaScanner {
  scan(key: string): Promise<{ safe: boolean; detectedContentType: string }>;
}
export interface MediaTransformer {
  variants(key: string): Promise<Readonly<Record<string, string>>>;
}
