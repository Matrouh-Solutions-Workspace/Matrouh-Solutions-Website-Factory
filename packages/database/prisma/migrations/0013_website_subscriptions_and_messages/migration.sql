CREATE TYPE "SubscriptionCadence" AS ENUM ('trial', 'monthly', 'yearly');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE "OutboundMessageStatus" AS ENUM ('queued', 'delivering', 'sent', 'failed');

ALTER TYPE "WebsiteStatus" ADD VALUE IF NOT EXISTS 'disabled';

ALTER TABLE "websites"
  ADD COLUMN "favicon_asset_id" UUID,
  ADD COLUMN "white_label_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "websites"
  ADD CONSTRAINT "websites_organization_id_favicon_asset_id_fkey"
  FOREIGN KEY ("organization_id", "favicon_asset_id")
  REFERENCES "media_assets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "website_subscriptions" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "website_id" UUID NOT NULL,
  "client_id" UUID,
  "cadence" "SubscriptionCadence" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
  "starts_at" TIMESTAMPTZ NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "last_notified_at" TIMESTAMPTZ,
  "disabled_at" TIMESTAMPTZ,
  "disabled_reason" VARCHAR(80),
  "resume_status" "WebsiteStatus",
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "website_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "website_subscriptions_website_id_key" UNIQUE ("website_id"),
  CONSTRAINT "website_subscriptions_organization_id_id_key" UNIQUE ("organization_id", "id"),
  CONSTRAINT "website_subscriptions_organization_id_website_id_key" UNIQUE ("organization_id", "website_id"),
  CONSTRAINT "website_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "website_subscriptions_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "website_subscriptions_organization_id_client_id_fkey" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "website_subscriptions_valid_window_check" CHECK ("expires_at" > "starts_at")
);
CREATE INDEX "website_subscriptions_organization_id_status_expires_at_idx" ON "website_subscriptions"("organization_id", "status", "expires_at");

CREATE TABLE "outbound_messages" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "website_id" UUID,
  "client_id" UUID,
  "recipient_email" VARCHAR(320) NOT NULL,
  "subject" VARCHAR(240) NOT NULL,
  "body_text" TEXT NOT NULL,
  "kind" VARCHAR(80) NOT NULL,
  "status" "OutboundMessageStatus" NOT NULL DEFAULT 'queued',
  "scheduled_for" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "sent_at" TIMESTAMPTZ,
  "failure_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbound_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "outbound_messages_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "outbound_messages_organization_id_client_id_fkey" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "outbound_messages_organization_id_status_available_at_idx" ON "outbound_messages"("organization_id", "status", "available_at");
CREATE INDEX "outbound_messages_website_id_created_at_idx" ON "outbound_messages"("website_id", "created_at");
CREATE UNIQUE INDEX "outbound_messages_website_id_kind_key" ON "outbound_messages"("website_id", "kind");
CREATE UNIQUE INDEX "memberships_pending_invited_email_key"
  ON "memberships"("organization_id", lower("invited_email"))
  WHERE "user_id" IS NULL AND "status" = 'invited' AND "invited_email" IS NOT NULL;

ALTER TABLE "website_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "website_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "website_subscriptions" USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
ALTER TABLE "outbound_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbound_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "outbound_messages" USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

-- Public traffic resolves only deliberately published websites. Draft, unpublished,
-- and subscription-disabled websites remain editable but disappear immediately from the renderer.
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
  w.revision AS mapping_version,
  favicon.storage_key AS favicon_storage_key,
  w.white_label_enabled,
  subscription.expires_at AS subscription_expires_at
FROM domains d
JOIN websites w ON w.organization_id = d.organization_id AND w.id = d.website_id
JOIN publications p ON p.organization_id = w.organization_id AND p.website_id = w.id AND p.id = w.active_publication_id
JOIN publication_artifacts pa ON pa.organization_id = p.organization_id AND pa.publication_id = p.id AND pa.artifact_kind = 'snapshot'
LEFT JOIN media_assets favicon ON favicon.organization_id = w.organization_id AND favicon.id = w.favicon_asset_id AND favicon.status = 'ready'
LEFT JOIN website_subscriptions subscription ON subscription.organization_id = w.organization_id AND subscription.website_id = w.id
WHERE d.status = 'active' AND p.status = 'ready' AND w.active_publication_id IS NOT NULL
  AND w.status = 'published'
  AND (subscription.id IS NULL OR (subscription.status = 'active' AND subscription.expires_at > CURRENT_TIMESTAMP));

CREATE OR REPLACE VIEW "renderer_preview_snapshots" WITH (security_barrier = true) AS
SELECT preview.id AS preview_id, preview.organization_id, preview.website_id,
       preview.storage_uri, preview.content_hash, preview.snapshot_schema_version,
       preview.expires_at, preview.token_hash, favicon.storage_key AS favicon_storage_key,
       website.white_label_enabled
FROM preview_snapshots preview
JOIN websites website ON website.organization_id = preview.organization_id AND website.id = preview.website_id
LEFT JOIN media_assets favicon ON favicon.organization_id = website.organization_id AND favicon.id = website.favicon_asset_id AND favicon.status = 'ready'
WHERE preview.expires_at > CURRENT_TIMESTAMP AND preview.token_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION list_subscription_lifecycle()
RETURNS TABLE (
  subscription_id uuid, organization_id uuid, website_id uuid, client_id uuid,
  cadence "SubscriptionCadence", expires_at timestamptz, website_name varchar,
  recipient_email varchar, subscription_status "SubscriptionStatus", website_status "WebsiteStatus"
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT s.id, s.organization_id, s.website_id, s.client_id, s.cadence, s.expires_at,
         w.name, c.contact_email, s.status, w.status
  FROM website_subscriptions s
  JOIN websites w ON w.organization_id = s.organization_id AND w.id = s.website_id
  LEFT JOIN clients c ON c.organization_id = s.organization_id AND c.id = s.client_id
  WHERE s.status = 'active' AND w.archived_at IS NULL;
$$;
REVOKE ALL ON FUNCTION list_subscription_lifecycle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_subscription_lifecycle() TO factory_worker;

CREATE OR REPLACE FUNCTION claim_outbound_message()
RETURNS TABLE (
  id uuid, organization_id uuid, website_id uuid, client_id uuid,
  recipient_email varchar, subject varchar, body_text text, kind varchar,
  attempt_count integer, max_attempts integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH candidate AS (
    SELECT message.id
    FROM outbound_messages message
    WHERE (message.status = 'queued' OR message.status = 'delivering')
      AND message.scheduled_for <= CURRENT_TIMESTAMP
      AND message.available_at <= CURRENT_TIMESTAMP
      AND message.attempt_count < message.max_attempts
    ORDER BY message.available_at, message.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE outbound_messages AS message
  SET status = 'delivering', attempt_count = message.attempt_count + 1,
      available_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
  FROM candidate
  WHERE message.id = candidate.id
  RETURNING message.id, message.organization_id, message.website_id, message.client_id,
    message.recipient_email, message.subject, message.body_text, message.kind,
    message.attempt_count, message.max_attempts;
$$;
REVOKE ALL ON FUNCTION claim_outbound_message() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_outbound_message() TO factory_worker;

CREATE OR REPLACE FUNCTION find_client_membership_invite(p_email varchar)
RETURNS TABLE (membership_id uuid, organization_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT membership.id, membership.organization_id
  FROM memberships membership
  JOIN membership_roles membership_role
    ON membership_role.organization_id = membership.organization_id
   AND membership_role.membership_id = membership.id
  JOIN roles role
    ON role.organization_id = membership_role.organization_id
   AND role.id = membership_role.role_id
  WHERE membership.status = 'invited'
    AND membership.user_id IS NULL
    AND membership.invited_email IS NOT NULL
    AND lower(membership.invited_email) = lower(p_email)
    AND role.key = 'client'
  ORDER BY membership.created_at, membership.id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION find_client_membership_invite(varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_client_membership_invite(varchar) TO factory_app;

GRANT SELECT, INSERT, UPDATE ON website_subscriptions, outbound_messages TO factory_app;
GRANT SELECT, INSERT, UPDATE ON users, auth_identities, sessions TO factory_app;
GRANT SELECT, INSERT, UPDATE ON website_subscriptions, outbound_messages TO factory_worker;
GRANT SELECT ON "renderer_active_sites", "renderer_preview_snapshots" TO factory_renderer;
