import { createHash } from "node:crypto";
import { z } from "zod";
import type { JsonValue, ThemeTokens } from "@factory/template-sdk";

export const PUBLICATION_SNAPSHOT_VERSION = 1 as const;
const id = z.string().min(1).max(160);
const json: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(json),
    z.record(z.string(), json),
  ]),
);
export const publicationSnapshotSchema = z.object({
  snapshotVersion: z.literal(PUBLICATION_SNAPSHOT_VERSION),
  publicationId: id,
  organizationId: id,
  websiteId: id,
  sourceDraftRevision: z.string().regex(/^\d+$/),
  template: z.object({ id, version: id, artifactHash: z.string().min(32) }),
  website: z.object({
    name: z.string().min(1).max(200),
    defaultLocale: z.string().min(2).max(35),
    settings: json,
  }),
  locales: z.array(z.object({ locale: z.string(), fallbackLocale: z.string().nullable() })).min(1),
  routes: z.array(z.object({ routeId: id, pathname: z.string(), pageId: id, locale: z.string() })),
  pages: z.array(
    z.object({
      id,
      pageTypeId: id,
      locale: z.string(),
      title: z.string(),
      slug: z.string(),
      seo: json.nullable(),
      sections: z.array(
        z.object({
          id,
          sectionTypeId: id,
          schemaVersion: z.number().int().positive(),
          content: json,
          orderKey: z.string(),
        }),
      ),
    }),
  ),
  navigation: z.array(
    z.object({ definitionId: id, locale: z.string().nullable(), nodes: z.array(json) }),
  ),
  theme: json,
  media: z.array(z.object({ id, url: z.string(), variants: z.record(z.string(), z.string()) })),
});
export type PublicationSnapshot = z.infer<typeof publicationSnapshotSchema> & {
  theme: ThemeTokens;
};

export function canonicalize(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key] as JsonValue)}`)
    .join(",")}}`;
}
export function snapshotBytes(snapshot: PublicationSnapshot): Uint8Array {
  return new TextEncoder().encode(canonicalize(snapshot));
}
export function snapshotHash(snapshot: PublicationSnapshot): string {
  return createHash("sha256").update(snapshotBytes(snapshot)).digest("hex");
}
export function parseSnapshot(input: unknown): PublicationSnapshot {
  return publicationSnapshotSchema.parse(input) as PublicationSnapshot;
}
