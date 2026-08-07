import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { cache } from "react";
import { createDatabaseClient, type DatabaseClient } from "@factory/database";
import { normalizeHostname } from "@factory/domains";
import {
  snapshotBytes,
  previewTokenHash,
  verifyPreviewToken,
  type PublicationSnapshot,
} from "@factory/publication-contract";
import {
  loadCatalogedTemplateArtifact,
  type LoadedTemplateArtifact,
} from "@factory/template-loader";
import { rendererConfig, workspaceRoot } from "./config";
import { rendererArtifactStore as artifactStore } from "./artifact-store";

const maximumArtifactBytes = 2_000_000;
const domainCacheTtlMs = 1_000;
const negativeCacheTtlMs = 3_000;

export interface LoadedSite {
  readonly organizationId: string;
  readonly snapshot: PublicationSnapshot;
  readonly template: LoadedTemplateArtifact["definition"];
  readonly artifact: LoadedTemplateArtifact;
  readonly mappingVersion: string;
  readonly preview: boolean;
  readonly branding: {
    readonly faviconUrl: string | null;
    readonly whiteLabelEnabled: boolean;
  };
}

interface ActiveSiteRow {
  hostname_normalized: string;
  organization_id: string;
  website_id: string;
  publication_id: string;
  template_id: string;
  template_version: string;
  template_artifact_hash: string;
  snapshot_schema_version: number;
  storage_uri: string;
  content_hash: string;
  byte_size: bigint;
  mapping_version: bigint;
  favicon_storage_key: string | null;
  white_label_enabled: boolean;
  subscription_expires_at: Date | null;
}

interface PreviewRow {
  preview_id: string;
  organization_id: string;
  website_id: string;
  storage_uri: string;
  content_hash: string;
  snapshot_schema_version: number;
  expires_at: Date;
  token_hash: string;
  favicon_storage_key: string | null;
  white_label_enabled: boolean;
}

interface CacheEntry {
  readonly expiresAt: number;
  readonly value: LoadedSite | null;
}

const globalRenderer = globalThis as unknown as {
  database?: DatabaseClient;
  domains?: Map<string, CacheEntry>;
  templates?: Map<string, Promise<LoadedTemplateArtifact>>;
};

function database(): DatabaseClient {
  globalRenderer.database ??= createDatabaseClient({
    connectionString: rendererConfig.DATABASE_RENDERER_URL ?? rendererConfig.DATABASE_URL,
  });
  return globalRenderer.database;
}

function domainCache(): Map<string, CacheEntry> {
  globalRenderer.domains ??= new Map();
  return globalRenderer.domains;
}

function templateCache(): Map<string, Promise<LoadedTemplateArtifact>> {
  globalRenderer.templates ??= new Map();
  return globalRenderer.templates;
}

function templatesRoot(): string {
  return resolve(
    /*turbopackIgnore: true*/
    workspaceRoot,
    rendererConfig.FACTORY_TEMPLATE_DIRECTORY,
  );
}

export const loadSite = cache(async (hostname: string): Promise<LoadedSite | null> => {
  let normalized: string;
  try {
    normalized = normalizeHostname(hostname);
  } catch {
    return null;
  }
  const existing = domainCache().get(normalized);
  if (existing && existing.expiresAt > Date.now()) return existing.value;

  const rows = await database().$queryRaw<ActiveSiteRow[]>`
    SELECT hostname_normalized, organization_id, website_id, publication_id,
           template_id, template_version, template_artifact_hash,
           snapshot_schema_version, storage_uri, content_hash, byte_size, mapping_version,
           favicon_storage_key, white_label_enabled, subscription_expires_at
    FROM renderer_active_sites
    WHERE hostname_normalized = ${normalized}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    domainCache().set(normalized, { expiresAt: Date.now() + negativeCacheTtlMs, value: null });
    return null;
  }
  const site = await loadResolvedSite(row, false);
  domainCache().set(normalized, {
    expiresAt: Math.min(
      Date.now() + domainCacheTtlMs,
      row.subscription_expires_at?.getTime() ?? Number.POSITIVE_INFINITY,
    ),
    value: site,
  });
  return site;
});

export async function loadPreviewSite(token: string | undefined): Promise<LoadedSite | null> {
  if (!token) return null;
  const secret = rendererConfig.PREVIEW_SIGNING_SECRET;
  let claims: ReturnType<typeof verifyPreviewToken>;
  try {
    claims = verifyPreviewToken(token, secret);
  } catch {
    return null;
  }
  const tokenDigest = previewTokenHash(token);
  const rows = await database().$queryRaw<PreviewRow[]>`
    SELECT preview_id, organization_id, website_id, storage_uri, content_hash,
           snapshot_schema_version, expires_at, token_hash, favicon_storage_key,
           white_label_enabled
    FROM renderer_preview_snapshots
    WHERE preview_id = ${claims.previewId}
      AND organization_id = ${claims.organizationId}::uuid
      AND website_id = ${claims.websiteId}::uuid
      AND token_hash = ${tokenDigest}
      AND expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const snapshot = await readSnapshot(row.storage_uri, row.content_hash, maximumArtifactBytes);
  if (
    snapshot.publicationId !== claims.previewId ||
    snapshot.organizationId !== claims.organizationId ||
    snapshot.websiteId !== claims.websiteId ||
    snapshot.snapshotVersion !== row.snapshot_schema_version
  ) {
    throw new SiteLoadError("RENDERER_PREVIEW_IDENTITY_MISMATCH");
  }
  const artifact = await loadExactTemplate(snapshot);
  return Object.freeze({
    organizationId: row.organization_id,
    snapshot,
    template: artifact.definition,
    artifact,
    mappingVersion: `preview:${claims.nonce}`,
    preview: true,
    branding: branding(row.favicon_storage_key, row.white_label_enabled),
  });
}

export async function loadCatalogTemplateArtifact(
  templateId: string,
  templateVersion: string,
): Promise<LoadedTemplateArtifact | null> {
  const versions = await database().$queryRaw<{ artifact_uri: string; artifact_hash: string }[]>`
    SELECT artifact_uri, artifact_hash
    FROM template_versions
    WHERE template_id = ${templateId}
      AND template_version = ${templateVersion}
      AND validation_status = 'valid'
      AND lifecycle_status IN ('ready', 'deprecated')
    LIMIT 1
  `;
  const version = versions[0];
  if (!version) return null;
  const artifact = await loadCatalogedTemplateArtifact(templatesRoot(), version.artifact_uri, {
    templateId,
    templateVersion,
  });
  return artifact.artifactHash === version.artifact_hash ? artifact : null;
}

export async function listPublicRoutes(hostname: string): Promise<string[]> {
  const site = await loadSite(hostname);
  if (!site) return [];
  return site.snapshot.routes
    .filter((route) => route.indexingPolicy === "index")
    .map((route) => route.pathname)
    .sort();
}

export async function checkRendererReadiness(): Promise<void> {
  await database().$queryRaw`SELECT 1`;
  await artifactStore.ready();
  await access(templatesRoot());
}

export function invalidateHostname(hostname: string): void {
  try {
    domainCache().delete(normalizeHostname(hostname));
  } catch {
    // Invalid hostnames cannot have cache entries.
  }
}

async function loadResolvedSite(row: ActiveSiteRow, preview: boolean): Promise<LoadedSite> {
  if (row.byte_size > BigInt(maximumArtifactBytes)) {
    throw new SiteLoadError("RENDERER_ARTIFACT_TOO_LARGE");
  }
  const snapshot = await readSnapshot(row.storage_uri, row.content_hash, Number(row.byte_size));
  if (
    snapshot.organizationId !== row.organization_id ||
    snapshot.websiteId !== row.website_id ||
    snapshot.publicationId !== row.publication_id ||
    snapshot.template.id !== row.template_id ||
    snapshot.template.version !== row.template_version ||
    snapshot.template.artifactHash !== row.template_artifact_hash ||
    snapshot.snapshotVersion !== row.snapshot_schema_version
  ) {
    throw new SiteLoadError("RENDERER_RESOLUTION_IDENTITY_MISMATCH");
  }
  const artifact = await loadExactTemplate(snapshot);
  return Object.freeze({
    organizationId: row.organization_id,
    snapshot,
    template: artifact.definition,
    artifact,
    mappingVersion: row.mapping_version.toString(),
    preview,
    branding: branding(row.favicon_storage_key, row.white_label_enabled),
  });
}

function branding(
  faviconStorageKey: string | null,
  whiteLabelEnabled: boolean,
): LoadedSite["branding"] {
  const filename = faviconStorageKey?.split("/").at(-1);
  const localUrl = filename ? `/media/${encodeURIComponent(filename)}` : null;
  return Object.freeze({
    faviconUrl: localUrl,
    whiteLabelEnabled,
  });
}

async function loadExactTemplate(snapshot: PublicationSnapshot): Promise<LoadedTemplateArtifact> {
  const key = `${snapshot.template.id}@${snapshot.template.version}:${snapshot.template.artifactHash}`;
  let pending = templateCache().get(key);
  if (!pending) {
    pending = (async () => {
      const versions = await database().$queryRaw<
        { artifact_uri: string; artifact_hash: string }[]
      >`
        SELECT artifact_uri, artifact_hash
        FROM template_versions
        WHERE template_id = ${snapshot.template.id}
          AND template_version = ${snapshot.template.version}
          AND validation_status = 'valid'
          AND lifecycle_status IN ('ready', 'deprecated')
        LIMIT 1
      `;
      const version = versions[0];
      if (!version || version.artifact_hash !== snapshot.template.artifactHash) {
        throw new SiteLoadError("RENDERER_TEMPLATE_NOT_CATALOGED");
      }
      const loaded = await loadCatalogedTemplateArtifact(templatesRoot(), version.artifact_uri, {
        templateId: snapshot.template.id,
        templateVersion: snapshot.template.version,
      });
      if (
        loaded.artifactHash !== snapshot.template.artifactHash ||
        loaded.manifest.manifestHash !== snapshot.template.manifestHash
      ) {
        throw new SiteLoadError("RENDERER_TEMPLATE_INTEGRITY_MISMATCH");
      }
      return loaded;
    })();
    templateCache().set(key, pending);
    pending.catch(() => templateCache().delete(key));
  }
  return pending;
}

async function readSnapshot(
  storageUri: string,
  expectedHash: string,
  expectedMaximumBytes: number,
): Promise<PublicationSnapshot> {
  let snapshot: PublicationSnapshot;
  try {
    snapshot = await artifactStore.get(storageUri);
  } catch (error) {
    throw new SiteLoadError("RENDERER_ARTIFACT_READ_FAILED", { cause: error });
  }
  if (snapshotBytes(snapshot).byteLength > Math.min(maximumArtifactBytes, expectedMaximumBytes)) {
    throw new SiteLoadError("RENDERER_ARTIFACT_SIZE_MISMATCH");
  }
  if (snapshot.integrity.contentHash !== expectedHash) {
    throw new SiteLoadError("RENDERER_ARTIFACT_HASH_MISMATCH");
  }
  return snapshot;
}

export class SiteLoadError extends Error {
  constructor(
    public readonly code: string,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "SiteLoadError";
  }
}
