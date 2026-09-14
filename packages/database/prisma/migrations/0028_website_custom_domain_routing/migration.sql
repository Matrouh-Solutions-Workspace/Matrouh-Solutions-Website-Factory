CREATE TYPE "DomainRoutingMode" AS ENUM ('exact', 'wildcard');

ALTER TABLE "domains"
  ADD COLUMN "root_hostname" varchar(253),
  ADD COLUMN "routing_mode" "DomainRoutingMode" NOT NULL DEFAULT 'exact',
  ADD COLUMN "is_primary" boolean NOT NULL DEFAULT false;

UPDATE "domains"
SET "root_hostname" = CASE
  WHEN "hostname_normalized" LIKE '%.localhost' THEN 'localhost'
  ELSE regexp_replace("hostname_normalized", '^www\.', '')
END;

ALTER TABLE "domains" ALTER COLUMN "root_hostname" SET NOT NULL;
CREATE INDEX "domains_root_hostname_idx" ON "domains" ("root_hostname");
CREATE UNIQUE INDEX "domains_one_primary_per_website_idx"
  ON "domains" ("organization_id", "website_id")
  WHERE "is_primary" = true AND "released_at" IS NULL;

-- Prevent an exact hostname and a wildcard owned by different websites from
-- creating ambiguous routing, including across tenant RLS boundaries.
CREATE OR REPLACE FUNCTION enforce_domain_route_isolation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.root_hostname));
  IF NEW.released_at IS NULL AND EXISTS (
    SELECT 1 FROM domains existing
    WHERE existing.released_at IS NULL AND existing.id <> NEW.id
      AND existing.website_id <> NEW.website_id
      AND (
        existing.hostname_normalized = NEW.hostname_normalized
        OR (existing.routing_mode = 'wildcard' AND NEW.routing_mode = 'exact'
            AND NEW.hostname_normalized <> existing.root_hostname
            AND NEW.hostname_normalized LIKE ('%.' || existing.root_hostname))
        OR (NEW.routing_mode = 'wildcard' AND existing.routing_mode = 'exact'
            AND existing.hostname_normalized <> NEW.root_hostname
            AND existing.hostname_normalized LIKE ('%.' || NEW.root_hostname))
      )
  ) THEN
    RAISE EXCEPTION 'DOMAIN_ROUTE_CONFLICT' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER domains_route_isolation
BEFORE INSERT OR UPDATE OF hostname_normalized, root_hostname, routing_mode, website_id, released_at
ON domains FOR EACH ROW EXECUTE FUNCTION enforce_domain_route_isolation();

DROP VIEW "renderer_active_sites";
CREATE VIEW "renderer_active_sites" WITH (security_barrier = true) AS
SELECT
  d.hostname_normalized,
  d.root_hostname,
  d.routing_mode,
  d.is_primary,
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
WHERE d.status = 'active' AND d.released_at IS NULL AND p.status = 'ready' AND w.active_publication_id IS NOT NULL
  AND w.status = 'published'
  AND (subscription.id IS NULL OR (subscription.status = 'active' AND subscription.expires_at > CURRENT_TIMESTAMP));

REVOKE ALL ON "renderer_active_sites" FROM PUBLIC;
GRANT SELECT ON "renderer_active_sites" TO factory_renderer;

CREATE OR REPLACE FUNCTION resolve_active_ecommerce_store(p_hostname text)
RETURNS TABLE (organization_id uuid, store_id uuid, website_id uuid, currency varchar)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT store.organization_id, store.id, store.website_id, store.currency
  FROM domains domain_row
  JOIN websites website ON website.organization_id = domain_row.organization_id AND website.id = domain_row.website_id
  JOIN ecommerce_stores store ON store.organization_id = website.organization_id AND store.website_id = website.id
  LEFT JOIN website_subscriptions subscription ON subscription.organization_id = website.organization_id AND subscription.website_id = website.id
  WHERE (
      (domain_row.routing_mode = 'exact' AND domain_row.hostname_normalized = lower(split_part(p_hostname, ':', 1)))
      OR (domain_row.routing_mode = 'wildcard'
          AND lower(split_part(p_hostname, ':', 1)) <> domain_row.root_hostname
          AND lower(split_part(p_hostname, ':', 1)) LIKE ('%.' || domain_row.root_hostname))
    )
    AND domain_row.status = 'active' AND domain_row.released_at IS NULL
    AND website.kind = 'ecommerce' AND website.status = 'published' AND website.archived_at IS NULL
    AND store.status = 'active' AND store.archived_at IS NULL
    AND (subscription.id IS NULL OR (subscription.status = 'active' AND subscription.expires_at > CURRENT_TIMESTAMP))
  ORDER BY CASE WHEN domain_row.routing_mode = 'exact' THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION authorize_public_hostname(p_hostname text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM domains d
    JOIN websites w ON w.organization_id = d.organization_id AND w.id = d.website_id
    WHERE d.status = 'active' AND d.released_at IS NULL
      AND w.status = 'published' AND w.archived_at IS NULL
      AND (
        (d.routing_mode = 'exact' AND d.hostname_normalized = lower(split_part(p_hostname, ':', 1)))
        OR (d.routing_mode = 'wildcard'
            AND lower(split_part(p_hostname, ':', 1)) <> d.root_hostname
            AND lower(split_part(p_hostname, ':', 1)) LIKE ('%.' || d.root_hostname))
      )
  );
$$;

REVOKE ALL ON FUNCTION authorize_public_hostname(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authorize_public_hostname(text) TO factory_app;
