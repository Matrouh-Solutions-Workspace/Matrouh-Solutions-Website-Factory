ALTER TABLE "users" ADD COLUMN "password_hash" VARCHAR(255);

CREATE TABLE "website_claims" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "website_id" UUID NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL UNIQUE,
  "intended_email" VARCHAR(320),
  "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ NOT NULL,
  "claimed_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
  "claimed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "website_claims_website_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "website_claims_organization_id_id_key" UNIQUE ("organization_id", "id")
);
CREATE INDEX "website_claims_organization_id_website_id_status_idx" ON "website_claims" ("organization_id", "website_id", "status");

ALTER TABLE "website_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "website_claims" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "website_claims" USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

CREATE OR REPLACE FUNCTION find_website_claim(p_token_hash varchar)
RETURNS TABLE (claim_id uuid, organization_id uuid, website_id uuid, website_name varchar, intended_email varchar)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT claim.id, claim.organization_id, claim.website_id, website.name, claim.intended_email
  FROM website_claims claim
  JOIN websites website ON website.organization_id = claim.organization_id AND website.id = claim.website_id
  WHERE claim.token_hash = p_token_hash AND claim.status = 'pending' AND claim.expires_at > CURRENT_TIMESTAMP
    AND website.archived_at IS NULL AND website.client_id IS NULL
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION find_website_claim(varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_website_claim(varchar) TO factory_app;

GRANT SELECT, INSERT, UPDATE ON users, sessions, website_claims TO factory_app;
