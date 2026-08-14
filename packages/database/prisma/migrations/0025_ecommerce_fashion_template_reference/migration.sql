-- Keep the denormalized Website presentation reference aligned for stores that
-- were created with the original general-store template before it became Maison.
UPDATE websites AS website
SET
  template_id = 'ecommerce:fashion-store',
  template_version = template_version.version,
  revision = website.revision + 1,
  updated_at = CURRENT_TIMESTAMP
FROM ecommerce_stores AS store
JOIN ecommerce_template_versions AS template_version
  ON template_version.id = store.ecommerce_template_version_id
WHERE website.organization_id = store.organization_id
  AND website.id = store.website_id
  AND website.kind = 'ecommerce'
  AND website.template_id = 'ecommerce:general-store'
  AND template_version.renderer_key = 'fashion-store';
