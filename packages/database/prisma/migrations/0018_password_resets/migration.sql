CREATE TABLE "password_resets" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "token_hash" VARCHAR(128) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "password_resets_user_id_expires_at_idx" ON "password_resets" ("user_id", "expires_at");

ALTER TABLE "password_resets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_resets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "password_resets" USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "password_resets" TO factory_app;

CREATE OR REPLACE FUNCTION find_active_password_reset(p_token_hash varchar)
RETURNS TABLE (reset_id uuid, organization_id uuid, user_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT id, organization_id, user_id
  FROM password_resets
  WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION find_active_password_reset(varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_active_password_reset(varchar) TO factory_app;
