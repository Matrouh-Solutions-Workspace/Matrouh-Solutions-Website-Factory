-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'suspended', 'archived', 'deletion_pending');

-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('draft', 'published', 'unpublished', 'archived');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('compiling', 'validating', 'ready', 'failed', 'retired');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('pending', 'verifying', 'verified', 'connecting', 'active', 'failed', 'disconnected');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('pending_upload', 'quarantined', 'scanning', 'processing', 'ready', 'rejected', 'deleted');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'retryable', 'succeeded', 'failed', 'dead_letter');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'delivering', 'published', 'failed');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "default_locale" VARCHAR(35) NOT NULL,
    "plan_key" VARCHAR(80) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "primary_email" VARCHAR(320) NOT NULL,
    "normalized_email" VARCHAR(320) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_key" VARCHAR(80) NOT NULL,
    "provider_subject" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "status" VARCHAR(24) NOT NULL,
    "invited_email" VARCHAR(320),
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "description" VARCHAR(300) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "organization_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "organization_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("membership_id","role_id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "contact_name" VARCHAR(200),
    "contact_email" VARCHAR(320),
    "contact_phone" VARCHAR(50),
    "notes" TEXT,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'draft',
    "template_id" VARCHAR(160) NOT NULL,
    "template_version" VARCHAR(64) NOT NULL,
    "default_locale" VARCHAR(35) NOT NULL,
    "draft_revision" BIGINT NOT NULL DEFAULT 1,
    "active_publication_id" UUID,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_locales" (
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "fallback_locale" VARCHAR(35),

    CONSTRAINT "website_locales_pkey" PRIMARY KEY ("website_id","locale")
);

-- CreateTable
CREATE TABLE "page_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "page_type_id" VARCHAR(160) NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(240) NOT NULL,
    "order_key" VARCHAR(128) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "page_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "section_type_id" VARCHAR(160) NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "content_json" JSONB NOT NULL,
    "order_key" VARCHAR(128) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "section_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_catalog_entries" (
    "id" UUID NOT NULL,
    "template_id" VARCHAR(160) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "author" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "lifecycle_status" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "template_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_versions" (
    "id" UUID NOT NULL,
    "template_catalog_entry_id" UUID NOT NULL,
    "template_id" VARCHAR(160) NOT NULL,
    "template_version" VARCHAR(64) NOT NULL,
    "artifact_uri" TEXT NOT NULL,
    "artifact_hash" VARCHAR(128) NOT NULL,
    "sdk_version" VARCHAR(64) NOT NULL,
    "minimum_factory_version" VARCHAR(64) NOT NULL,
    "maximum_factory_version" VARCHAR(64),
    "minimum_renderer_version" VARCHAR(64) NOT NULL,
    "content_schema_version" INTEGER NOT NULL,
    "theme_schema_version" INTEGER NOT NULL,
    "publication_snapshot_version" INTEGER NOT NULL,
    "manifest_json" JSONB NOT NULL,
    "validation_report_json" JSONB NOT NULL,
    "validation_status" VARCHAR(24) NOT NULL,
    "lifecycle_status" VARCHAR(24) NOT NULL,
    "discovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validated_at" TIMESTAMPTZ,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "sequence_number" BIGINT NOT NULL,
    "source_draft_revision" BIGINT NOT NULL,
    "template_id" VARCHAR(160) NOT NULL,
    "template_version" VARCHAR(64) NOT NULL,
    "template_artifact_hash" VARCHAR(128) NOT NULL,
    "snapshot_schema_version" INTEGER NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'compiling',
    "failure_code" VARCHAR(120),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_at" TIMESTAMPTZ,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_artifacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "artifact_kind" VARCHAR(40) NOT NULL,
    "storage_uri" TEXT NOT NULL,
    "content_hash" VARCHAR(128) NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "hostname_normalized" VARCHAR(253) NOT NULL,
    "hostname_display" VARCHAR(253) NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'pending',
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "released_at" TIMESTAMPTZ,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'pending_upload',
    "kind" VARCHAR(24) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_hash" VARCHAR(128),
    "detected_content_type" VARCHAR(160),
    "byte_size" BIGINT NOT NULL,
    "metadata_json" JSONB NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "type" VARCHAR(120) NOT NULL,
    "version" INTEGER NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "locked_at" TIMESTAMPTZ,
    "lock_owner" VARCHAR(160),
    "lock_expires_at" TIMESTAMPTZ,
    "deduplication_key" VARCHAR(160),
    "correlation_id" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "event_type" VARCHAR(160) NOT NULL,
    "event_version" INTEGER NOT NULL,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" VARCHAR(160) NOT NULL,
    "aggregate_revision" BIGINT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" VARCHAR(160) NOT NULL,
    "causation_id" VARCHAR(160),
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "actor_type" VARCHAR(40) NOT NULL,
    "actor_id" VARCHAR(160),
    "action" VARCHAR(160) NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(160),
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" VARCHAR(160) NOT NULL,
    "metadata_json" JSONB NOT NULL,
    "retention_class" VARCHAR(40) NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "scope" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(128) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "response_json" JSONB,
    "resource_id" VARCHAR(160),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_normalized_email_key" ON "users"("normalized_email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_key_provider_subject_key" ON "auth_identities"("provider_key", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_id_key" ON "memberships"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_user_id_key" ON "memberships"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organization_id_id_key" ON "roles"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organization_id_key_key" ON "roles"("organization_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "clients_organization_id_archived_at_name_idx" ON "clients"("organization_id", "archived_at", "name");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organization_id_id_key" ON "clients"("organization_id", "id");

-- CreateIndex
CREATE INDEX "websites_organization_id_status_updated_at_idx" ON "websites"("organization_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "websites_organization_id_id_key" ON "websites"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "websites_organization_id_id_active_publication_id_key" ON "websites"("organization_id", "id", "active_publication_id");

-- CreateIndex
CREATE INDEX "page_drafts_website_id_locale_order_key_idx" ON "page_drafts"("website_id", "locale", "order_key");

-- CreateIndex
CREATE UNIQUE INDEX "page_drafts_organization_id_website_id_id_key" ON "page_drafts"("organization_id", "website_id", "id");

-- CreateIndex
CREATE INDEX "section_drafts_page_id_order_key_idx" ON "section_drafts"("page_id", "order_key");

-- CreateIndex
CREATE UNIQUE INDEX "template_catalog_entries_template_id_key" ON "template_catalog_entries"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_template_id_template_version_key" ON "template_versions"("template_id", "template_version");

-- CreateIndex
CREATE INDEX "publications_website_id_status_created_at_idx" ON "publications"("website_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "publications_organization_id_website_id_id_key" ON "publications"("organization_id", "website_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "publications_website_id_sequence_number_key" ON "publications"("website_id", "sequence_number");

-- CreateIndex
CREATE UNIQUE INDEX "publication_artifacts_publication_id_artifact_kind_key" ON "publication_artifacts"("publication_id", "artifact_kind");

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_normalized_key" ON "domains"("hostname_normalized");

-- CreateIndex
CREATE INDEX "domains_organization_id_website_id_idx" ON "domains"("organization_id", "website_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_organization_id_status_created_at_idx" ON "media_assets"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "jobs_status_priority_available_at_idx" ON "jobs"("status", "priority", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_occurred_at_idx" ON "outbox_events"("aggregate_type", "aggregate_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_occurred_at_idx" ON "audit_events"("organization_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_organization_id_scope_key_hash_key" ON "idempotency_records"("organization_id", "scope", "key_hash");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organization_id_role_id_fkey" FOREIGN KEY ("organization_id", "role_id") REFERENCES "roles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_organization_id_membership_id_fkey" FOREIGN KEY ("organization_id", "membership_id") REFERENCES "memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_organization_id_role_id_fkey" FOREIGN KEY ("organization_id", "role_id") REFERENCES "roles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_organization_id_client_id_fkey" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_organization_id_id_active_publication_id_fkey" FOREIGN KEY ("organization_id", "id", "active_publication_id") REFERENCES "publications"("organization_id", "website_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_locales" ADD CONSTRAINT "website_locales_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_drafts" ADD CONSTRAINT "page_drafts_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_drafts" ADD CONSTRAINT "section_drafts_organization_id_website_id_page_id_fkey" FOREIGN KEY ("organization_id", "website_id", "page_id") REFERENCES "page_drafts"("organization_id", "website_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_catalog_entry_id_fkey" FOREIGN KEY ("template_catalog_entry_id") REFERENCES "template_catalog_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_artifacts" ADD CONSTRAINT "publication_artifacts_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce tenant isolation at the database boundary. Application transactions set
-- app.organization_id before accessing tenant-owned rows.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'memberships','roles','role_permissions','membership_roles','clients','websites','website_locales',
    'page_drafts','section_drafts','publications','publication_artifacts','domains','media_assets',
    'jobs','outbox_events','audit_events','idempotency_records'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;
