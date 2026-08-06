SET lock_timeout = '5s';
SET statement_timeout = '60s';

ALTER TABLE "website_locales"
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "website_settings_drafts" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "website_id" UUID NOT NULL,
  "locale" VARCHAR(35),
  "schema_version" INTEGER NOT NULL,
  "content_json" JSONB NOT NULL,
  "content_size_bytes" INTEGER NOT NULL,
  "revision" BIGINT NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "website_settings_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "website_settings_drafts_schema_version_check" CHECK ("schema_version" > 0),
  CONSTRAINT "website_settings_drafts_content_size_check" CHECK ("content_size_bytes" >= 0 AND "content_size_bytes" <= 1048576),
  CONSTRAINT "website_settings_drafts_organization_id_website_id_fkey"
    FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "website_settings_drafts_organization_id_website_id_id_key"
  ON "website_settings_drafts"("organization_id", "website_id", "id");
CREATE INDEX "website_settings_drafts_organization_id_website_id_locale_idx"
  ON "website_settings_drafts"("organization_id", "website_id", "locale");
CREATE UNIQUE INDEX "website_settings_drafts_global_scope_key"
  ON "website_settings_drafts"("organization_id", "website_id") WHERE "locale" IS NULL;
CREATE UNIQUE INDEX "website_settings_drafts_locale_scope_key"
  ON "website_settings_drafts"("organization_id", "website_id", "locale") WHERE "locale" IS NOT NULL;

ALTER TABLE "page_drafts"
  ADD COLUMN "status" VARCHAR(24) NOT NULL DEFAULT 'active',
  ADD COLUMN "schema_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "settings_json" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "page_drafts"
  ADD CONSTRAINT "page_drafts_schema_version_check" CHECK ("schema_version" > 0),
  ADD CONSTRAINT "page_drafts_status_check" CHECK ("status" IN ('active', 'hidden', 'deleted'));
CREATE UNIQUE INDEX "page_drafts_organization_id_id_key" ON "page_drafts"("organization_id", "id");
CREATE UNIQUE INDEX "page_drafts_live_slug_key"
  ON "page_drafts"("organization_id", "website_id", "locale", "slug") WHERE "deleted_at" IS NULL;

ALTER TABLE "section_drafts"
  ADD COLUMN "content_size_bytes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "visibility_json" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "section_drafts"
  ADD CONSTRAINT "section_drafts_schema_version_check" CHECK ("schema_version" > 0),
  ADD CONSTRAINT "section_drafts_content_size_check" CHECK ("content_size_bytes" >= 0 AND "content_size_bytes" <= 1048576);
CREATE UNIQUE INDEX "section_drafts_organization_id_id_key" ON "section_drafts"("organization_id", "id");
CREATE UNIQUE INDEX "section_drafts_live_order_key"
  ON "section_drafts"("organization_id", "page_id", "order_key") WHERE "deleted_at" IS NULL;

ALTER TABLE "navigation_node_drafts" DROP CONSTRAINT "navigation_node_drafts_parent_node_id_fkey";
CREATE UNIQUE INDEX "navigation_node_drafts_tenant_navigation_id_key"
  ON "navigation_node_drafts"("organization_id", "website_id", "navigation_id", "id");
ALTER TABLE "navigation_node_drafts"
  ADD CONSTRAINT "navigation_node_drafts_tenant_parent_fkey"
  FOREIGN KEY ("organization_id", "website_id", "navigation_id", "parent_node_id")
  REFERENCES "navigation_node_drafts"("organization_id", "website_id", "navigation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "theme_drafts"
  ADD COLUMN "locale" VARCHAR(35),
  ADD COLUMN "content_size_bytes" INTEGER NOT NULL DEFAULT 0;
DROP INDEX "theme_drafts_organization_id_website_id_theme_definition_id_key";
ALTER TABLE "theme_drafts"
  ADD CONSTRAINT "theme_drafts_schema_version_check" CHECK ("schema_version" > 0),
  ADD CONSTRAINT "theme_drafts_content_size_check" CHECK ("content_size_bytes" >= 0 AND "content_size_bytes" <= 1048576);
CREATE INDEX "theme_drafts_organization_id_website_id_locale_idx"
  ON "theme_drafts"("organization_id", "website_id", "locale");
CREATE UNIQUE INDEX "theme_drafts_global_scope_key"
  ON "theme_drafts"("organization_id", "website_id", "theme_definition_id") WHERE "locale" IS NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "theme_drafts_locale_scope_key"
  ON "theme_drafts"("organization_id", "website_id", "theme_definition_id", "locale") WHERE "locale" IS NOT NULL AND "deleted_at" IS NULL;

ALTER TABLE "seo_drafts" ADD COLUMN "content_size_bytes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "seo_drafts"
  ADD CONSTRAINT "seo_drafts_schema_version_check" CHECK ("schema_version" > 0),
  ADD CONSTRAINT "seo_drafts_content_size_check" CHECK ("content_size_bytes" >= 0 AND "content_size_bytes" <= 1048576);

CREATE TABLE "component_catalog_entries" (
  "id" UUID NOT NULL,
  "artifact_kind" VARCHAR(24) NOT NULL,
  "artifact_id" UUID NOT NULL,
  "owner_id" VARCHAR(160) NOT NULL,
  "owner_version" VARCHAR(64) NOT NULL,
  "component_kind" VARCHAR(24) NOT NULL,
  "component_id" VARCHAR(160) NOT NULL,
  "display_name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(100),
  "search_text" TEXT NOT NULL,
  "metadata_json" JSONB NOT NULL,
  "schema_version" INTEGER NOT NULL,
  "indexed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "component_catalog_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_catalog_entries_kind_check" CHECK ("component_kind" IN ('widget', 'block', 'section', 'theme', 'plugin')),
  CONSTRAINT "component_catalog_entries_schema_version_check" CHECK ("schema_version" > 0)
);
CREATE UNIQUE INDEX "component_catalog_entries_artifact_component_key"
  ON "component_catalog_entries"("artifact_kind", "artifact_id", "component_kind", "component_id");
CREATE INDEX "component_catalog_entries_kind_category_idx"
  ON "component_catalog_entries"("component_kind", "category");
CREATE INDEX "component_catalog_entries_search_idx"
  ON "component_catalog_entries" USING GIN (to_tsvector('simple', "search_text"));

CREATE UNIQUE INDEX "publications_organization_id_id_key" ON "publications"("organization_id", "id");
ALTER TABLE "publication_artifacts" DROP CONSTRAINT "publication_artifacts_publication_id_fkey";
ALTER TABLE "publication_artifacts"
  ADD CONSTRAINT "publication_artifacts_organization_id_publication_id_fkey"
  FOREIGN KEY ("organization_id", "publication_id") REFERENCES "publications"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "preview_snapshots" ADD COLUMN "token_hash" VARCHAR(64);
CREATE UNIQUE INDEX "preview_snapshots_token_hash_key" ON "preview_snapshots"("token_hash");

CREATE UNIQUE INDEX "domains_organization_id_id_key" ON "domains"("organization_id", "id");
ALTER TABLE "domain_verification_attempts" DROP CONSTRAINT "domain_verification_attempts_domain_id_fkey";
ALTER TABLE "domain_verification_attempts"
  ADD CONSTRAINT "domain_verification_attempts_organization_id_domain_id_fkey"
  FOREIGN KEY ("organization_id", "domain_id") REFERENCES "domains"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certificate_bindings" DROP CONSTRAINT "certificate_bindings_domain_id_fkey";
ALTER TABLE "certificate_bindings"
  ADD CONSTRAINT "certificate_bindings_organization_id_domain_id_fkey"
  FOREIGN KEY ("organization_id", "domain_id") REFERENCES "domains"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "media_assets_organization_id_id_key" ON "media_assets"("organization_id", "id");
ALTER TABLE "media_folders" DROP CONSTRAINT "media_folders_parent_folder_id_fkey";
ALTER TABLE "media_folders"
  ADD CONSTRAINT "media_folders_organization_id_parent_folder_id_fkey"
  FOREIGN KEY ("organization_id", "parent_folder_id") REFERENCES "media_folders"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_variants" DROP CONSTRAINT "media_variants_media_asset_id_fkey";
ALTER TABLE "media_variants"
  ADD CONSTRAINT "media_variants_organization_id_media_asset_id_fkey"
  FOREIGN KEY ("organization_id", "media_asset_id") REFERENCES "media_assets"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_references" DROP CONSTRAINT "media_references_media_asset_id_fkey";
ALTER TABLE "media_references" DROP CONSTRAINT "media_references_section_id_fkey";
ALTER TABLE "media_references"
  ADD CONSTRAINT "media_references_organization_id_media_asset_id_fkey"
  FOREIGN KEY ("organization_id", "media_asset_id") REFERENCES "media_assets"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "media_references_organization_id_section_id_fkey"
  FOREIGN KEY ("organization_id", "section_id") REFERENCES "section_drafts"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "organizations_active_slug_key" ON "organizations"(lower("slug")) WHERE "archived_at" IS NULL;
CREATE UNIQUE INDEX "website_locales_one_default_key" ON "website_locales"("organization_id", "website_id") WHERE "is_default";
ALTER TABLE "website_locales" ADD CONSTRAINT "website_locales_fallback_check" CHECK ("fallback_locale" IS NULL OR "fallback_locale" <> "locale");

ALTER TABLE "website_settings_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "website_settings_drafts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "website_settings_drafts"
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

CREATE OR REPLACE VIEW "renderer_active_sites" WITH (security_barrier = true) AS
SELECT
  d.hostname_normalized,
  d.organization_id,
  d.website_id,
  w.active_publication_id AS publication_id,
  p.template_id,
  p.template_version,
  p.template_artifact_hash,
  p.snapshot_schema_version,
  pa.storage_uri,
  pa.content_hash,
  pa.byte_size,
  w.revision AS mapping_version
FROM domains d
JOIN websites w ON w.organization_id = d.organization_id AND w.id = d.website_id
JOIN publications p ON p.organization_id = w.organization_id AND p.website_id = w.id AND p.id = w.active_publication_id
JOIN publication_artifacts pa ON pa.organization_id = p.organization_id AND pa.publication_id = p.id AND pa.artifact_kind = 'snapshot'
WHERE d.status = 'active' AND p.status = 'ready' AND w.active_publication_id IS NOT NULL;

CREATE OR REPLACE VIEW "renderer_preview_snapshots" WITH (security_barrier = true) AS
SELECT id AS preview_id, organization_id, website_id, storage_uri, content_hash,
       snapshot_schema_version, expires_at, token_hash
FROM preview_snapshots
WHERE expires_at > CURRENT_TIMESTAMP AND token_hash IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'factory_app') THEN
    CREATE ROLE factory_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'factory_renderer') THEN
    CREATE ROLE factory_renderer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'factory_maintenance') THEN
    CREATE ROLE factory_maintenance NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'factory_worker') THEN
    CREATE ROLE factory_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION claim_publication_job(p_worker_id text)
RETURNS TABLE (
  id uuid, organization_id uuid, payload_json jsonb, attempt_count integer,
  max_attempts integer, available_at timestamptz, correlation_id varchar
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH candidate AS (
    SELECT jobs.id FROM jobs
    WHERE type = 'publication.requested' AND version = 1 AND organization_id IS NOT NULL
      AND ((status IN ('queued', 'retryable') AND available_at <= CURRENT_TIMESTAMP)
        OR (status = 'running' AND lock_expires_at < CURRENT_TIMESTAMP))
    ORDER BY priority DESC, available_at ASC, created_at ASC
    FOR UPDATE SKIP LOCKED LIMIT 1
  )
  UPDATE jobs AS job SET status = 'running', attempt_count = job.attempt_count + 1,
    locked_at = CURRENT_TIMESTAMP, lock_owner = p_worker_id,
    lock_expires_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
  FROM candidate WHERE job.id = candidate.id
  RETURNING job.id, job.organization_id, job.payload_json, job.attempt_count,
    job.max_attempts, job.available_at, job.correlation_id;
$$;

REVOKE ALL ON FUNCTION claim_publication_job(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_publication_job(text) TO factory_worker;

REVOKE ALL ON "renderer_active_sites", "renderer_preview_snapshots" FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO factory_app;
GRANT USAGE ON SCHEMA public TO factory_renderer;
GRANT SELECT ON "renderer_active_sites", "renderer_preview_snapshots" TO factory_renderer;
GRANT USAGE ON SCHEMA public TO factory_worker;

GRANT SELECT ON organizations, users, sessions, permissions,
  template_catalog_entries, template_versions, component_catalog_entries,
  plugin_catalog_entries, plugin_versions TO factory_app;
GRANT SELECT, INSERT, UPDATE ON memberships, roles, role_permissions, membership_roles,
  clients, websites, website_locales, website_settings_drafts, page_drafts, section_drafts,
  navigation_drafts, navigation_node_drafts, theme_drafts, seo_drafts,
  publications, publication_artifacts, publication_activations, preview_snapshots,
  plugin_installations, domains, domain_verification_attempts, certificate_bindings,
  media_folders, media_assets, media_variants, media_references,
  jobs, job_attempts, outbox_events, audit_events, idempotency_records TO factory_app;

GRANT SELECT, INSERT, UPDATE ON jobs, job_attempts, publications, publication_artifacts,
  publication_activations, websites, website_locales, website_settings_drafts,
  page_drafts, section_drafts, navigation_drafts, navigation_node_drafts,
  theme_drafts, seo_drafts, media_assets, media_variants, media_references,
  domains, outbox_events, audit_events TO factory_worker;
