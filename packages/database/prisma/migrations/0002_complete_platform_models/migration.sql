-- Add draft, publication, domain, media, and job tables required by the approved specs.

CREATE TABLE "navigation_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "definition_id" VARCHAR(160) NOT NULL,
    "locale" VARCHAR(35),
    "visibility_schema_version" INTEGER NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "navigation_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "navigation_node_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "navigation_id" UUID NOT NULL,
    "parent_node_id" UUID,
    "node_kind" VARCHAR(24) NOT NULL,
    "page_id" UUID,
    "label_json" JSONB NOT NULL,
    "target_json" JSONB NOT NULL,
    "visibility_json" JSONB NOT NULL,
    "order_key" VARCHAR(128) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "navigation_node_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "theme_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "theme_definition_id" VARCHAR(160) NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "tokens_json" JSONB NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "theme_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "page_id" UUID,
    "locale" VARCHAR(35),
    "schema_version" INTEGER NOT NULL,
    "metadata_json" JSONB NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "seo_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publication_activations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "activation_kind" VARCHAR(24) NOT NULL,
    "previous_publication_id" UUID,
    "activated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" VARCHAR(160),
    "correlation_id" VARCHAR(160) NOT NULL,
    CONSTRAINT "publication_activations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "preview_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "publication_id" UUID,
    "snapshot_schema_version" INTEGER NOT NULL,
    "storage_uri" TEXT NOT NULL,
    "content_hash" VARCHAR(128) NOT NULL,
    "source_draft_revision" BIGINT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMPTZ,
    CONSTRAINT "preview_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domain_verification_attempts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "challenge_kind" VARCHAR(40) NOT NULL,
    "challenge_value_hash" VARCHAR(128) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "checked_at" TIMESTAMPTZ,
    "failure_code" VARCHAR(120),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "domain_verification_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "certificate_bindings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "provider_key" VARCHAR(80) NOT NULL,
    "provider_binding_id" VARCHAR(200) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "issued_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "last_checked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "certificate_bindings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_folders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "parent_folder_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "order_key" VARCHAR(128) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,
    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "media_assets" ADD COLUMN "folder_id" UUID;

CREATE TABLE "media_variants" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "variant_key" VARCHAR(80) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_hash" VARCHAR(128),
    "content_type" VARCHAR(160) NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_references" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "website_id" UUID,
    "page_id" UUID,
    "section_id" UUID,
    "publication_id" UUID,
    "reference_kind" VARCHAR(40) NOT NULL,
    "json_pointer" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_attempts" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "job_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "status" VARCHAR(24) NOT NULL,
    "error_code" VARCHAR(120),
    "error_message" TEXT,
    "worker_id" VARCHAR(160),
    CONSTRAINT "job_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "navigation_drafts_organization_id_website_id_id_key" ON "navigation_drafts"("organization_id", "website_id", "id");
CREATE UNIQUE INDEX "navigation_drafts_organization_id_website_id_definition_id_locale_key" ON "navigation_drafts"("organization_id", "website_id", "definition_id", "locale");
CREATE INDEX "navigation_drafts_website_id_definition_id_idx" ON "navigation_drafts"("website_id", "definition_id");
CREATE UNIQUE INDEX "navigation_node_drafts_organization_id_website_id_id_key" ON "navigation_node_drafts"("organization_id", "website_id", "id");
CREATE INDEX "navigation_node_drafts_navigation_id_parent_node_id_order_key_idx" ON "navigation_node_drafts"("navigation_id", "parent_node_id", "order_key");
CREATE UNIQUE INDEX "theme_drafts_organization_id_website_id_id_key" ON "theme_drafts"("organization_id", "website_id", "id");
CREATE UNIQUE INDEX "theme_drafts_organization_id_website_id_theme_definition_id_key" ON "theme_drafts"("organization_id", "website_id", "theme_definition_id");
CREATE UNIQUE INDEX "seo_drafts_organization_id_website_id_id_key" ON "seo_drafts"("organization_id", "website_id", "id");
CREATE UNIQUE INDEX "seo_drafts_organization_id_website_id_page_id_locale_key" ON "seo_drafts"("organization_id", "website_id", "page_id", "locale");
CREATE INDEX "seo_drafts_website_id_locale_idx" ON "seo_drafts"("website_id", "locale");
CREATE INDEX "publication_activations_website_id_activated_at_idx" ON "publication_activations"("website_id", "activated_at");
CREATE INDEX "preview_snapshots_website_id_expires_at_idx" ON "preview_snapshots"("website_id", "expires_at");
CREATE INDEX "domain_verification_attempts_organization_id_domain_id_created_at_idx" ON "domain_verification_attempts"("organization_id", "domain_id", "created_at");
CREATE UNIQUE INDEX "certificate_bindings_provider_key_provider_binding_id_key" ON "certificate_bindings"("provider_key", "provider_binding_id");
CREATE INDEX "certificate_bindings_organization_id_domain_id_idx" ON "certificate_bindings"("organization_id", "domain_id");
CREATE UNIQUE INDEX "media_folders_organization_id_id_key" ON "media_folders"("organization_id", "id");
CREATE INDEX "media_folders_organization_id_parent_folder_id_order_key_idx" ON "media_folders"("organization_id", "parent_folder_id", "order_key");
CREATE UNIQUE INDEX "media_variants_media_asset_id_variant_key_key" ON "media_variants"("media_asset_id", "variant_key");
CREATE INDEX "media_variants_organization_id_media_asset_id_idx" ON "media_variants"("organization_id", "media_asset_id");
CREATE INDEX "media_references_organization_id_media_asset_id_idx" ON "media_references"("organization_id", "media_asset_id");
CREATE INDEX "media_references_website_id_page_id_section_id_idx" ON "media_references"("website_id", "page_id", "section_id");
CREATE INDEX "media_references_publication_id_idx" ON "media_references"("publication_id");
CREATE UNIQUE INDEX "job_attempts_job_id_attempt_number_key" ON "job_attempts"("job_id", "attempt_number");
CREATE INDEX "job_attempts_organization_id_started_at_idx" ON "job_attempts"("organization_id", "started_at");

ALTER TABLE "navigation_drafts" ADD CONSTRAINT "navigation_drafts_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "navigation_node_drafts" ADD CONSTRAINT "navigation_node_drafts_organization_id_website_id_navigation_id_fkey" FOREIGN KEY ("organization_id", "website_id", "navigation_id") REFERENCES "navigation_drafts"("organization_id", "website_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "navigation_node_drafts" ADD CONSTRAINT "navigation_node_drafts_parent_node_id_fkey" FOREIGN KEY ("parent_node_id") REFERENCES "navigation_node_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "theme_drafts" ADD CONSTRAINT "theme_drafts_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seo_drafts" ADD CONSTRAINT "seo_drafts_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seo_drafts" ADD CONSTRAINT "seo_drafts_organization_id_website_id_page_id_fkey" FOREIGN KEY ("organization_id", "website_id", "page_id") REFERENCES "page_drafts"("organization_id", "website_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publication_activations" ADD CONSTRAINT "publication_activations_organization_id_website_id_publication_id_fkey" FOREIGN KEY ("organization_id", "website_id", "publication_id") REFERENCES "publications"("organization_id", "website_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "preview_snapshots" ADD CONSTRAINT "preview_snapshots_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "preview_snapshots" ADD CONSTRAINT "preview_snapshots_organization_id_website_id_publication_id_fkey" FOREIGN KEY ("organization_id", "website_id", "publication_id") REFERENCES "publications"("organization_id", "website_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "domain_verification_attempts" ADD CONSTRAINT "domain_verification_attempts_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certificate_bindings" ADD CONSTRAINT "certificate_bindings_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "media_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_organization_id_folder_id_fkey" FOREIGN KEY ("organization_id", "folder_id") REFERENCES "media_folders"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'navigation_drafts','navigation_node_drafts','theme_drafts','seo_drafts',
    'publication_activations','preview_snapshots','domain_verification_attempts','certificate_bindings',
    'media_folders','media_variants','media_references','job_attempts'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;
