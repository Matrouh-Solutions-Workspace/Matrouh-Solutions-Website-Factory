-- Commerce templates are presentation-only. Catalog, inventory, customers, carts,
-- and orders remain attached to the store when a template version changes.
UPDATE ecommerce_templates
SET
  slug = 'fashion-store',
  name = 'Maison — Fashion Store',
  description = 'An editorial, image-led storefront for fashion, lifestyle, beauty, and curated brands.',
  status = 'ready',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'ec000000-0000-4000-8000-000000000001';

UPDATE ecommerce_template_versions
SET
  renderer_key = 'fashion-store',
  capabilities_json = '{"bilingual":true,"rtl":true,"darkMode":true,"catalog":true,"cart":true,"checkout":true,"search":true,"facetedFilters":true,"accessibleSliders":true,"customerAccounts":false}'::jsonb,
  presentation_json = '{"layout":"editorial-fashion","defaultTheme":"light","tokens":{"primary":"#171512","accent":"#a45f3f","surface":"#f8f6f1","radius":"18px"},"sections":["announcement","searchNavigation","manualHeroSlider","benefits","visualCategories","editorialStory","productRail","facetedCatalog","brandStory","newsletter","richFooter"]}'::jsonb,
  status = 'ready',
  published_at = COALESCE(published_at, CURRENT_TIMESTAMP)
WHERE id = 'ec000000-0000-4000-8000-000000000002';

INSERT INTO ecommerce_templates (
  id, slug, name, description, status, created_at, updated_at
)
VALUES (
  'ec000000-0000-4000-8000-000000000003',
  'hardware-store',
  'Forge — Hardware Store',
  'A technical, search-first storefront for tools, hardware, parts, building supplies, and trade catalogs.',
  'ready',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO ecommerce_template_versions (
  id, template_id, version, status, renderer_key, schema_version,
  capabilities_json, presentation_json, created_at, published_at
)
VALUES (
  'ec000000-0000-4000-8000-000000000004',
  (SELECT id FROM ecommerce_templates WHERE slug = 'hardware-store'),
  '1.0.0',
  'ready',
  'hardware-store',
  1,
  '{"bilingual":true,"rtl":true,"darkMode":true,"catalog":true,"cart":true,"checkout":true,"skuSearch":true,"facetedFilters":true,"compatibilityCues":true,"accessibleSliders":true,"customerAccounts":false}'::jsonb,
  '{"layout":"technical-hardware","defaultTheme":"light","tokens":{"primary":"#111619","accent":"#ffb000","surface":"#f4f5f6","radius":"8px"},"sections":["tradeAnnouncement","skuSearchNavigation","manualHeroSlider","serviceBenefits","departments","buyingGuide","dealRail","facetedCatalog","trustMetrics","newsletter","richFooter"]}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (template_id, version) DO UPDATE SET
  status = EXCLUDED.status,
  renderer_key = EXCLUDED.renderer_key,
  capabilities_json = EXCLUDED.capabilities_json,
  presentation_json = EXCLUDED.presentation_json,
  published_at = COALESCE(ecommerce_template_versions.published_at, EXCLUDED.published_at);
