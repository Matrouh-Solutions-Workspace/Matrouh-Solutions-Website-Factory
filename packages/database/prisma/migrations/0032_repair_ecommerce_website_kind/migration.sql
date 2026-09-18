-- Older ecommerce records could retain the WebsiteKind default ('standard')
-- even though they are linked from ecommerce_stores. Public ecommerce routing
-- intentionally requires this discriminator, so repair those legacy rows.
UPDATE websites AS website
SET kind = 'ecommerce',
    revision = website.revision + 1,
    updated_at = CURRENT_TIMESTAMP
FROM ecommerce_stores AS store
WHERE store.organization_id = website.organization_id
  AND store.website_id = website.id
  AND website.kind <> 'ecommerce';
