-- Ecommerce tables were introduced after 0017 removed FORCE ROW LEVEL SECURITY
-- from the original tenant tables. In production the public storefront functions
-- run as their owner through SECURITY DEFINER, but FORCE RLS still applies to the
-- table owner and made every ecommerce lookup return no rows. Keep RLS enabled so
-- application roles remain tenant-scoped; only restore the owner bypass required
-- by the narrow public storefront functions.
DO $$
DECLARE
  tenant_table record;
BEGIN
  FOR tenant_table IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE 'ecommerce\_%' ESCAPE '\'
      AND c.relrowsecurity
      AND c.relforcerowsecurity
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I NO FORCE ROW LEVEL SECURITY',
      tenant_table.schema_name,
      tenant_table.table_name
    );
  END LOOP;
END $$;

-- Migrations 0032 and 0033 joined ecommerce_stores while FORCE RLS was still
-- active, so a restricted production migrator could apply them while updating
-- zero rows. Repeat both repairs now that their source rows are visible.
UPDATE websites AS website
SET kind = 'ecommerce',
    revision = website.revision + 1,
    updated_at = CURRENT_TIMESTAMP
FROM ecommerce_stores AS store
WHERE store.organization_id = website.organization_id
  AND store.website_id = website.id
  AND website.kind <> 'ecommerce';

WITH candidates AS (
  SELECT
    domain_row.id AS domain_id,
    hosting.hostname_normalized AS root_hostname,
    store.slug || '.' || hosting.hostname_normalized AS preferred_hostname,
    store.slug || '-' || left(store.id::text, 8) || '.' || hosting.hostname_normalized
      AS fallback_hostname
  FROM domains AS domain_row
  JOIN ecommerce_stores AS store
    ON store.organization_id = domain_row.organization_id
   AND store.website_id = domain_row.website_id
  JOIN LATERAL (
    SELECT configured.hostname_normalized
    FROM hosting_domains AS configured
    WHERE configured.organization_id = store.organization_id
    ORDER BY configured.is_default DESC, configured.hostname_normalized ASC
    LIMIT 1
  ) AS hosting ON true
  WHERE domain_row.released_at IS NULL
    AND domain_row.hostname_normalized LIKE '%.localhost'
), resolved AS (
  SELECT
    candidate.domain_id,
    candidate.root_hostname,
    CASE WHEN EXISTS (
      SELECT 1
      FROM domains AS conflict
      WHERE conflict.id <> candidate.domain_id
        AND conflict.released_at IS NULL
        AND conflict.hostname_normalized = candidate.preferred_hostname
    ) THEN candidate.fallback_hostname ELSE candidate.preferred_hostname END AS hostname
  FROM candidates AS candidate
)
UPDATE domains AS domain_row
SET hostname_normalized = resolved.hostname,
    hostname_display = resolved.hostname,
    root_hostname = resolved.root_hostname,
    routing_mode = 'exact',
    kind = 'subdomain',
    status = 'active',
    revision = domain_row.revision + 1,
    updated_at = CURRENT_TIMESTAMP
FROM resolved
WHERE domain_row.id = resolved.domain_id;
