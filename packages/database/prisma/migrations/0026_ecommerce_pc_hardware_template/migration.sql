-- A dedicated PC-components storefront. It remains presentation-only so an
-- existing catalog, inventory, customers, carts, and orders survive switching.
INSERT INTO ecommerce_templates (
  id, slug, name, description, status, created_at, updated_at
)
VALUES (
  'ec000000-0000-4000-8000-000000000005',
  'pc-hardware-store',
  'Nexus — PC Components Store',
  'A compatibility-first storefront for PC components, custom builds, gaming hardware, workstations, and upgrades.',
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
  'ec000000-0000-4000-8000-000000000006',
  (SELECT id FROM ecommerce_templates WHERE slug = 'pc-hardware-store'),
  '1.0.0',
  'ready',
  'pc-hardware-store',
  1,
  '{"bilingual":true,"rtl":true,"darkMode":true,"catalog":true,"cart":true,"checkout":true,"skuSearch":true,"facetedFilters":true,"compatibilityCues":true,"specComparison":true,"buildGuides":true,"accessibleSliders":true,"customerAccounts":false}'::jsonb,
  '{"layout":"compatibility-first-pc","defaultTheme":"dark","tokens":{"primary":"#07111f","accent":"#00a8e8","surface":"#0c1421","radius":"12px"},"sections":["performanceAnnouncement","componentSearchNavigation","manualHeroSlider","buildBenefits","componentDepartments","compatibilityGuide","upgradeRail","facetedCatalog","buildTrustMetrics","newsletter","richFooter"]}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (template_id, version) DO UPDATE SET
  status = EXCLUDED.status,
  renderer_key = EXCLUDED.renderer_key,
  capabilities_json = EXCLUDED.capabilities_json,
  presentation_json = EXCLUDED.presentation_json,
  published_at = COALESCE(ecommerce_template_versions.published_at, EXCLUDED.published_at);
