-- Add plugin catalog and tenant installation records. Runtime marketplace behavior remains deferred.

CREATE TABLE "plugin_catalog_entries" (
    "id" UUID NOT NULL,
    "plugin_id" VARCHAR(160) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "author" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "lifecycle_status" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "plugin_catalog_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plugin_versions" (
    "id" UUID NOT NULL,
    "plugin_catalog_entry_id" UUID NOT NULL,
    "plugin_id" VARCHAR(160) NOT NULL,
    "plugin_version" VARCHAR(64) NOT NULL,
    "artifact_uri" TEXT NOT NULL,
    "artifact_hash" VARCHAR(128) NOT NULL,
    "sdk_version" VARCHAR(64) NOT NULL,
    "minimum_factory_version" VARCHAR(64) NOT NULL,
    "manifest_json" JSONB NOT NULL,
    "validation_report_json" JSONB NOT NULL,
    "validation_status" VARCHAR(24) NOT NULL,
    "lifecycle_status" VARCHAR(24) NOT NULL,
    "discovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validated_at" TIMESTAMPTZ,
    CONSTRAINT "plugin_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plugin_installations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plugin_version_id" UUID NOT NULL,
    "website_id" UUID,
    "status" VARCHAR(24) NOT NULL,
    "config_json" JSONB NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "installed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "uninstalled_at" TIMESTAMPTZ,
    CONSTRAINT "plugin_installations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plugin_catalog_entries_plugin_id_key" ON "plugin_catalog_entries"("plugin_id");
CREATE UNIQUE INDEX "plugin_versions_plugin_id_plugin_version_key" ON "plugin_versions"("plugin_id", "plugin_version");
CREATE UNIQUE INDEX "plugin_installations_organization_id_plugin_version_id_website_id_key" ON "plugin_installations"("organization_id", "plugin_version_id", "website_id");
CREATE INDEX "plugin_installations_organization_id_status_idx" ON "plugin_installations"("organization_id", "status");

ALTER TABLE "plugin_versions" ADD CONSTRAINT "plugin_versions_plugin_catalog_entry_id_fkey" FOREIGN KEY ("plugin_catalog_entry_id") REFERENCES "plugin_catalog_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_plugin_version_id_fkey" FOREIGN KEY ("plugin_version_id") REFERENCES "plugin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "plugin_installations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plugin_installations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "plugin_installations"
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
