-- Store public media references as immutable storage keys rather than the
-- user-supplied original filename. This repairs existing ecommerce content
-- selections and keeps /media/:filename aligned with uploaded files.
UPDATE ecommerce_stores AS store
SET settings_json = jsonb_set(store.settings_json, '{heroImageFilename}', to_jsonb(asset.storage_key), true)
FROM media_assets AS asset
WHERE store.settings_json ? 'heroMediaId'
  AND asset.organization_id = store.organization_id
  AND asset.id::text = store.settings_json ->> 'heroMediaId'
  AND asset.status = 'ready';

UPDATE ecommerce_stores AS store
SET settings_json = jsonb_set(store.settings_json, '{logoImageFilename}', to_jsonb(asset.storage_key), true)
FROM media_assets AS asset
WHERE store.settings_json ? 'logoMediaId'
  AND asset.organization_id = store.organization_id
  AND asset.id::text = store.settings_json ->> 'logoMediaId'
  AND asset.status = 'ready';
