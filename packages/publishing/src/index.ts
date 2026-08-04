import type { PublicationSnapshot } from "@factory/publication-contract";
export type PublishState = "queued" | "compiling" | "validating" | "ready" | "failed";
export interface PublicationArtifactStore {
  putImmutable(id: string, snapshot: PublicationSnapshot): Promise<{ uri: string; hash: string }>;
  get(uri: string): Promise<PublicationSnapshot>;
}
export interface PublicationActivator {
  activate(websiteId: string, publicationId: string): Promise<void>;
  rollback(websiteId: string, publicationId: string): Promise<void>;
}
export interface PublishStatus {
  id: string;
  state: PublishState;
  diagnostics: readonly { code: string; path: string; message: string }[];
}
