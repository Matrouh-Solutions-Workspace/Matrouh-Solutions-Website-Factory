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

export interface PublicTemplateCatalogItem {
  readonly templateId: string;
  readonly displayName: string;
  readonly description: string;
  readonly category: string;
  readonly categoryAr: string | null;
  readonly version: string;
  readonly features: readonly string[];
  readonly supportsDarkMode: boolean;
  readonly featured: boolean;
  readonly badge: string | null;
  readonly badgeAr: string | null;
  readonly ctaLabel: string | null;
  readonly ctaLabelAr: string | null;
  readonly ctaHref: string | null;
  readonly salesDescription: string | null;
  readonly salesDescriptionAr: string | null;
  readonly highlights: readonly string[];
  readonly highlightsAr: readonly string[];
}

interface PublicCommerceTemplateRow {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly renderer_key: string;
}

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

/** The public gallery exposes only validated, released catalog artifacts. */
export const loadPublicTemplateCatalog = cache(
  async (): Promise<readonly PublicTemplateCatalogItem[]> => {
    try {
      const rows = await database().$queryRaw<
        {
          template_id: string;
          display_name: string;
          description: string;
          category: string;
          catalog_category: string | null;
          catalog_category_ar: string | null;
          template_version: string;
          artifact_uri: string;
          catalog_featured: boolean;
          catalog_badge: string | null;
          catalog_badge_ar: string | null;
          catalog_cta_label: string | null;
          catalog_cta_label_ar: string | null;
          catalog_cta_href: string | null;
          catalog_sales_description: string | null;
          catalog_sales_description_ar: string | null;
          catalog_highlights_json: unknown;
          catalog_highlights_ar_json: unknown;
        }[]
      >`
        SELECT entry.template_id, entry.display_name, entry.description, entry.category,
               entry.catalog_category, entry.catalog_category_ar,
               entry.catalog_featured, entry.catalog_badge, entry.catalog_badge_ar,
               entry.catalog_cta_label, entry.catalog_cta_label_ar,
               entry.catalog_cta_href, entry.catalog_sales_description,
               entry.catalog_sales_description_ar, entry.catalog_highlights_json,
               entry.catalog_highlights_ar_json,
               version.template_version, version.artifact_uri
        FROM template_catalog_entries AS entry
        JOIN LATERAL (
          SELECT template_version, artifact_uri
          FROM template_versions
            WHERE template_catalog_entry_id = entry.id
              AND validation_status = 'valid'
              AND lifecycle_status IN ('ready', 'deprecated')
            ORDER BY string_to_array(template_version, '.')::int[] DESC
            LIMIT 1
        ) AS version ON TRUE
        WHERE entry.lifecycle_status IN ('ready', 'deprecated')
          AND entry.catalog_visible = true
        ORDER BY entry.catalog_featured DESC, entry.catalog_sort_order ASC, entry.display_name ASC
      `;
      const websiteTemplates = await Promise.all(
        rows.map(async (row) => {
          const artifact = await loadCatalogedTemplateArtifact(templatesRoot(), row.artifact_uri, {
            templateId: row.template_id,
            templateVersion: row.template_version,
          });
          const defaultSettings = artifact.definition.websiteSchema.parse({});
          const settingsRecord =
            defaultSettings &&
            typeof defaultSettings === "object" &&
            !Array.isArray(defaultSettings)
              ? defaultSettings
              : {};
          return {
            templateId: row.template_id,
            displayName: row.display_name,
            description: row.description,
            category: row.catalog_category || row.category,
            categoryAr: row.catalog_category_ar,
            version: row.template_version,
            features: [...(artifact.definition.manifest.features ?? [])],
            supportsDarkMode: artifact.definition.websiteSchema.safeParse({
              ...settingsRecord,
              colorMode: "dark",
            }).success,
            featured: row.catalog_featured,
            badge: row.catalog_badge,
            badgeAr: row.catalog_badge_ar,
            ctaLabel: row.catalog_cta_label,
            ctaLabelAr: row.catalog_cta_label_ar,
            ctaHref: row.catalog_cta_href,
            salesDescription: row.catalog_sales_description,
            salesDescriptionAr: row.catalog_sales_description_ar,
            highlights: stringArray(row.catalog_highlights_json),
            highlightsAr: stringArray(row.catalog_highlights_ar_json),
          };
        }),
      );
      const commerceTemplates = await loadPublicCommerceTemplateCatalog();
      return [...websiteTemplates, ...commerceTemplates];
    } catch (error) {
      if (rendererConfig.FACTORY_DEPLOYMENT_MODE !== "local") throw error;
      // Local previews should remain usable while a developer is rebuilding the catalog database.
      return localTemplateCatalog;
    }
  },
);

const localTemplateCatalog: readonly PublicTemplateCatalogItem[] = [
  {
    templateId: "com.matrouh.clinic",
    displayName: "Clinic",
    description: "A calm, connected clinic experience for teams, specialties, and locations.",
    category: "Healthcare",
    categoryAr: "الرعاية الصحية",
    version: "2.0.0",
    features: ["localized-content"],
    supportsDarkMode: true,
    ...localCatalogDetails(),
  },
  {
    templateId: "com.matrouh.creative",
    displayName: "Creative portfolio",
    description: "An editorial portfolio for studios, independent creatives, and selected work.",
    category: "Portfolio",
    categoryAr: "ملفات الأعمال",
    version: "1.0.0",
    features: ["localized-content"],
    supportsDarkMode: true,
    ...localCatalogDetails(),
  },
  {
    templateId: "com.matrouh.doctor",
    displayName: "Doctor",
    description:
      "A personal medical practice with services, trust signals, and appointment details.",
    category: "Healthcare",
    categoryAr: "الرعاية الصحية",
    version: "2.0.0",
    features: ["localized-content"],
    supportsDarkMode: true,
    ...localCatalogDetails(),
  },
  {
    templateId: "com.matrouh.engineer",
    displayName: "Engineer",
    description: "A precise, project-focused portfolio for engineering and architecture practices.",
    category: "Portfolio",
    categoryAr: "ملفات الأعمال",
    version: "2.0.1",
    features: ["localized-content"],
    supportsDarkMode: true,
    ...localCatalogDetails(),
  },
  {
    templateId: "com.matrouh.food-menu",
    displayName: "Food Menu",
    description:
      "A mobile-first bilingual digital menu for restaurants, cafés, bakeries, and food businesses.",
    category: "Food & Hospitality",
    categoryAr: "المطاعم والمقاهي",
    version: "1.0.0",
    features: ["localized-content", "digital-menu", "mobile-first"],
    supportsDarkMode: false,
    ...localCatalogDetails({ featured: true, badge: "New" }),
  },
  {
    templateId: "com.matrouh.cafe-menu",
    displayName: "Cafe & Restaurant QR Menu",
    description: "A bilingual, mobile-first café and restaurant menu with a printable QR workflow.",
    category: "Food & Hospitality",
    categoryAr: "المطاعم والمقاهي",
    version: "1.3.0",
    features: ["localized-content", "menu-management", "qr-code", "printable-qr", "dark-mode"],
    supportsDarkMode: true,
    ...localCatalogDetails({ featured: true, badge: "New", badgeAr: "جديد" }),
  },
  commerceCatalogItem("fashion-store", "1.0.0"),
  commerceCatalogItem("hardware-store", "1.0.0"),
  commerceCatalogItem("pc-hardware-store", "1.0.0"),
];

function commerceCatalogMetadataFor(rendererKey: string):
  | {
      readonly displayName: string;
      readonly description: string;
      readonly badge: string;
      readonly badgeAr: string;
    }
  | undefined {
  const metadata: Readonly<
    Record<
      string,
      {
        readonly displayName: string;
        readonly description: string;
        readonly badge: string;
        readonly badgeAr: string;
      }
    >
  > = {
    "fashion-store": {
      displayName: "Clothes Store",
      description:
        "An editorial, image-led storefront for fashion, lifestyle, beauty, and curated brands.",
      badge: "E-shop",
      badgeAr: "متجر إلكتروني",
    },
    "hardware-store": {
      displayName: "Hardware",
      description:
        "A technical storefront for tools, hardware, building supplies, parts, and trade catalogs.",
      badge: "E-shop",
      badgeAr: "متجر إلكتروني",
    },
    "pc-hardware-store": {
      displayName: "PC Hardware",
      description:
        "A compatibility-first storefront for PC components, custom builds, gaming hardware, and upgrades.",
      badge: "E-shop",
      badgeAr: "متجر إلكتروني",
    },
  };
  return metadata[rendererKey];
}

async function loadPublicCommerceTemplateCatalog(): Promise<readonly PublicTemplateCatalogItem[]> {
  const rows = await database().$queryRaw<PublicCommerceTemplateRow[]>`
    SELECT template.slug, template.name, template.description,
           version.version, version.renderer_key
    FROM ecommerce_templates AS template
    JOIN LATERAL (
      SELECT version, renderer_key
      FROM ecommerce_template_versions
      WHERE template_id = template.id
        AND status = 'ready'
        AND renderer_key IN ('fashion-store', 'hardware-store', 'pc-hardware-store')
      ORDER BY string_to_array(version, '.')::int[] DESC
      LIMIT 1
    ) AS version ON TRUE
    WHERE template.status = 'ready'
    ORDER BY template.name ASC
  `;
  return rows.map((row) => commerceCatalogItem(row.renderer_key, row.version, row));
}

function commerceCatalogItem(
  rendererKey: string,
  version: string,
  row?: Pick<PublicCommerceTemplateRow, "name" | "description">,
): PublicTemplateCatalogItem {
  const metadata = commerceCatalogMetadataFor(rendererKey);
  const displayName = metadata?.displayName ?? row?.name ?? rendererKey;
  const description = metadata?.description ?? row?.description ?? "E-commerce storefront";
  return {
    templateId: `ecommerce:${rendererKey}`,
    displayName,
    description,
    category: "E-commerce",
    categoryAr: "التجارة الإلكترونية",
    version,
    features: ["ecommerce", "product-catalog", "whatsapp-ordering"],
    supportsDarkMode: true,
    featured: false,
    badge: metadata?.badge ?? "E-shop",
    badgeAr: metadata?.badgeAr ?? "متجر إلكتروني",
    ctaLabel: null,
    ctaLabelAr: null,
    ctaHref: null,
    salesDescription: description,
    salesDescriptionAr: null,
    highlights: [
      "Store and product management dashboard",
      "WhatsApp ordering flow",
      "Arabic and English storefront",
      "Responsive product catalog",
    ],
    highlightsAr: [
      "لوحة تحكم للمتجر والمنتجات",
      "طلبات مباشرة عبر واتساب",
      "واجهة متجر بالعربية والإنجليزية",
      "كتالوج منتجات متجاوب",
    ],
  };
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function localCatalogDetails(overrides: Partial<PublicTemplateCatalogItem> = {}) {
  return {
    featured: false,
    badge: null,
    badgeAr: null,
    ctaLabel: null,
    ctaLabelAr: null,
    ctaHref: null,
    salesDescription: null,
    salesDescriptionAr: null,
    highlights: [] as readonly string[],
    highlightsAr: [] as readonly string[],
    ...overrides,
  };
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
