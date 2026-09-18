-- Early ecommerce creation forms submitted market.localhost as a real hostname
-- even in production. Move those active mappings onto each organization's
-- configured default hosting domain. A short store id suffix safely resolves a
-- possible cross-tenant slug collision without releasing either storefront.
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
