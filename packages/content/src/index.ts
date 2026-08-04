import type { JsonValue } from "@factory/template-sdk";
export interface SectionDraft {
  id: string;
  pageId: string;
  typeId: string;
  schemaVersion: number;
  content: JsonValue;
  orderKey: string;
  revision: bigint;
}
export interface ContentRepository {
  getSection(id: string): Promise<SectionDraft | null>;
  saveSection(section: SectionDraft, expectedRevision: bigint): Promise<SectionDraft>;
  freezeWebsite(websiteId: string, revision: bigint): Promise<unknown>;
}
export function rankedKey(index: number): string {
  return index.toString(36).padStart(12, "0");
}
