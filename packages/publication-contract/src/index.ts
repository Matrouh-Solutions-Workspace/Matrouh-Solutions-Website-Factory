import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { JsonValue, ThemeTokens } from "@factory/template-sdk";

export const PUBLICATION_SNAPSHOT_VERSION = 1 as const;
export const MAXIMUM_SNAPSHOT_BYTES = 2_000_000;
export const MAXIMUM_JSON_DEPTH = 32;
export const MAXIMUM_COLLECTION_ITEMS = 10_000;

const identifier = z.string().min(1).max(160);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const locale = z
  .string()
  .min(2)
  .max(35)
  .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/);
const safePath = z
  .string()
  .min(1)
  .max(2_048)
  .regex(/^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).*$/);
const safePublicUrl = z
  .string()
  .max(2_048)
  .refine((value) => {
    if (value.startsWith("/")) return true;
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" ||
        (url.protocol === "http:" &&
          (url.hostname === "localhost" || url.hostname.endsWith(".localhost")))
      );
    } catch {
      return false;
    }
  });

const json: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(json).max(MAXIMUM_COLLECTION_ITEMS),
    z.record(z.string(), json),
  ]),
);

export const seoDocumentSchema = z.strictObject({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  keywords: z.array(z.string().min(1).max(80)).max(30).optional(),
  canonicalPath: safePath.optional(),
  robots: z.strictObject({ index: z.boolean(), follow: z.boolean() }).optional(),
  openGraph: z.record(z.string(), json).optional(),
  twitter: z.record(z.string(), json).optional(),
  structuredData: z.array(z.record(z.string(), json)).max(20).optional(),
});

const snapshotContentSchema = z.strictObject({
  snapshotVersion: z.literal(PUBLICATION_SNAPSHOT_VERSION),
  publicationId: identifier,
  organizationId: identifier,
  websiteId: identifier,
  sourceDraftRevision: z.string().regex(/^[1-9]\d*$/),
  template: z.strictObject({
    id: identifier,
    version: z.string().min(1).max(64),
    artifactHash: sha256,
    manifestHash: z.string().min(16).max(128),
  }),
  website: z.strictObject({
    name: z.string().min(1).max(200),
    defaultLocale: locale,
    settingsSchemaVersion: z.number().int().positive(),
    settings: json,
  }),
  locales: z
    .array(
      z.strictObject({
        locale,
        fallbackLocale: locale.nullable(),
      }),
    )
    .min(1)
    .max(100),
  routes: z
    .array(
      z.strictObject({
        routeId: identifier,
        pathname: safePath,
        pageId: identifier,
        locale,
        indexingPolicy: z.enum(["index", "noindex"]),
      }),
    )
    .max(10_000),
  pages: z
    .array(
      z.strictObject({
        id: identifier,
        pageTypeId: identifier,
        locale,
        title: z.string().min(1).max(200),
        slug: z.string().max(240),
        seo: seoDocumentSchema.nullable(),
        sections: z
          .array(
            z.strictObject({
              id: identifier,
              sectionTypeId: identifier,
              schemaVersion: z.number().int().positive(),
              content: json,
              visibility: json.nullable(),
              orderKey: z.string().min(1).max(128),
            }),
          )
          .max(1_000),
      }),
    )
    .max(10_000),
  navigation: z
    .array(
      z.strictObject({
        definitionId: identifier,
        locale: locale.nullable(),
        schemaVersion: z.number().int().positive(),
        nodes: z.array(json).max(2_000),
      }),
    )
    .max(100),
  theme: json,
  themeSchemaVersion: z.number().int().positive(),
  media: z
    .array(
      z.strictObject({
        id: identifier,
        url: safePublicUrl,
        contentHash: sha256.nullable(),
        variants: z.record(z.string().regex(/^[a-z][a-z0-9-]*$/), safePublicUrl),
      }),
    )
    .max(10_000),
  capabilities: z.record(z.string(), json),
});

export const publicationSnapshotSchema = snapshotContentSchema.extend({
  integrity: z.strictObject({
    algorithm: z.literal("sha256"),
    contentHash: sha256,
  }),
});

export type PublicationSnapshot = z.infer<typeof publicationSnapshotSchema> & {
  theme: ThemeTokens;
};
export type PublicationSnapshotInput = z.input<typeof snapshotContentSchema> & {
  theme: ThemeTokens;
};

export function canonicalize(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value.normalize("NFC"));
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new SnapshotIntegrityError("SNAPSHOT_NON_FINITE_NUMBER");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) => `${JSON.stringify(key.normalize("NFC"))}:${canonicalize(value[key] as JsonValue)}`,
    )
    .join(",")}}`;
}

export function sealSnapshot(input: PublicationSnapshotInput): PublicationSnapshot {
  enforceJsonLimits(input);
  const content = snapshotContentSchema.parse(input) as PublicationSnapshotInput;
  const contentHash = hashJson(content as unknown as JsonValue);
  return publicationSnapshotSchema.parse({
    ...content,
    integrity: { algorithm: "sha256", contentHash },
  }) as PublicationSnapshot;
}

export function snapshotBytes(snapshot: PublicationSnapshot): Uint8Array {
  verifySnapshotIntegrity(snapshot);
  return new TextEncoder().encode(canonicalize(snapshot as unknown as JsonValue));
}

export function snapshotHash(snapshot: PublicationSnapshot): string {
  verifySnapshotIntegrity(snapshot);
  return snapshot.integrity.contentHash;
}

export function parseSnapshot(input: unknown): PublicationSnapshot {
  enforceJsonLimits(input);
  const snapshot = publicationSnapshotSchema.parse(input) as PublicationSnapshot;
  verifySnapshotIntegrity(snapshot);
  return snapshot;
}

export function verifySnapshotIntegrity(snapshot: PublicationSnapshot): void {
  const { integrity: _integrity, ...content } = snapshot;
  void _integrity;
  const actual = Buffer.from(hashJson(content as unknown as JsonValue), "hex");
  const expected = Buffer.from(snapshot.integrity.contentHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new SnapshotIntegrityError("SNAPSHOT_HASH_MISMATCH");
  }
}

export class SnapshotIntegrityError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "SnapshotIntegrityError";
  }
}

export interface PreviewTokenClaims {
  readonly version: 1;
  readonly issuer: "factory-dashboard";
  readonly audience: "factory-renderer-preview";
  readonly previewId: string;
  readonly organizationId: string;
  readonly websiteId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly nonce: string;
}

export function createPreviewToken(
  claims: Omit<PreviewTokenClaims, "version" | "issuer" | "audience">,
  secret: string,
): string {
  assertPreviewSecret(secret);
  if (
    !Number.isSafeInteger(claims.issuedAt) ||
    !Number.isSafeInteger(claims.expiresAt) ||
    claims.expiresAt <= claims.issuedAt ||
    claims.expiresAt - claims.issuedAt > 3_600
  ) {
    throw new SnapshotIntegrityError("PREVIEW_TOKEN_LIFETIME_INVALID");
  }
  const payload: PreviewTokenClaims = {
    version: 1,
    issuer: "factory-dashboard",
    audience: "factory-renderer-preview",
    ...claims,
  };
  const encoded = Buffer.from(canonicalize(payload as unknown as JsonValue), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyPreviewToken(
  token: string,
  secret: string,
  nowEpochSeconds = Math.floor(Date.now() / 1_000),
): PreviewTokenClaims {
  assertPreviewSecret(secret);
  if (token.length > 4_096) throw new SnapshotIntegrityError("PREVIEW_TOKEN_INVALID");
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) {
    throw new SnapshotIntegrityError("PREVIEW_TOKEN_INVALID");
  }
  const actual = Buffer.from(signature, "base64url");
  const expected = createHmac("sha256", secret).update(encoded).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new SnapshotIntegrityError("PREVIEW_TOKEN_INVALID");
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
  } catch {
    throw new SnapshotIntegrityError("PREVIEW_TOKEN_INVALID");
  }
  const schema = z.strictObject({
    version: z.literal(1),
    issuer: z.literal("factory-dashboard"),
    audience: z.literal("factory-renderer-preview"),
    previewId: identifier,
    organizationId: identifier,
    websiteId: identifier,
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
    nonce: z.string().min(32).max(128),
  });
  const claims = schema.parse(value) as PreviewTokenClaims;
  if (claims.issuedAt > nowEpochSeconds + 30 || claims.expiresAt <= nowEpochSeconds) {
    throw new SnapshotIntegrityError("PREVIEW_TOKEN_EXPIRED");
  }
  return claims;
}

export function previewTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashJson(value: JsonValue): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function assertPreviewSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new SnapshotIntegrityError("PREVIEW_SIGNING_SECRET_REQUIRED");
  }
}

function enforceJsonLimits(value: unknown): void {
  let count = 0;
  const visit = (node: unknown, depth: number): void => {
    if (depth > MAXIMUM_JSON_DEPTH) throw new SnapshotIntegrityError("SNAPSHOT_DEPTH_LIMIT");
    count += 1;
    if (count > MAXIMUM_COLLECTION_ITEMS * 10) {
      throw new SnapshotIntegrityError("SNAPSHOT_COLLECTION_LIMIT");
    }
    if (Array.isArray(node)) {
      if (node.length > MAXIMUM_COLLECTION_ITEMS) {
        throw new SnapshotIntegrityError("SNAPSHOT_COLLECTION_LIMIT");
      }
      node.forEach((child) => visit(child, depth + 1));
    } else if (node !== null && typeof node === "object") {
      const entries = Object.entries(node);
      if (entries.length > MAXIMUM_COLLECTION_ITEMS) {
        throw new SnapshotIntegrityError("SNAPSHOT_COLLECTION_LIMIT");
      }
      entries.forEach(([, child]) => visit(child, depth + 1));
    }
  };
  visit(value, 0);
  const serialized = JSON.stringify(value);
  if (serialized === undefined || Buffer.byteLength(serialized, "utf8") > MAXIMUM_SNAPSHOT_BYTES) {
    throw new SnapshotIntegrityError("SNAPSHOT_BYTE_LIMIT");
  }
}
