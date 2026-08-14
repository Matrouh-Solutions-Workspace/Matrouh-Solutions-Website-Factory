-- Public commerce access is exposed only through narrow security-definer functions.
-- The renderer never receives direct access to tenant tables or draft stores.
CREATE OR REPLACE FUNCTION resolve_active_ecommerce_store(p_hostname text)
RETURNS TABLE (organization_id uuid, store_id uuid, website_id uuid, currency varchar)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT store.organization_id, store.id, store.website_id, store.currency
  FROM domains domain_row
  JOIN websites website
    ON website.organization_id = domain_row.organization_id
   AND website.id = domain_row.website_id
  JOIN ecommerce_stores store
    ON store.organization_id = website.organization_id
   AND store.website_id = website.id
  LEFT JOIN website_subscriptions subscription
    ON subscription.organization_id = website.organization_id
   AND subscription.website_id = website.id
  WHERE domain_row.hostname_normalized = lower(split_part(p_hostname, ':', 1))
    AND domain_row.status = 'active'
    AND domain_row.released_at IS NULL
    AND website.kind = 'ecommerce'
    AND website.status = 'published'
    AND website.archived_at IS NULL
    AND store.status = 'active'
    AND store.archived_at IS NULL
    AND (subscription.id IS NULL OR (
      subscription.status = 'active' AND subscription.expires_at > CURRENT_TIMESTAMP
    ))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_ecommerce_storefront(p_hostname text, p_locale text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'organizationId', store.organization_id,
    'storeId', store.id,
    'websiteId', store.website_id,
    'name', COALESCE(locale_row.store_name, store.name),
    'description', COALESCE(locale_row.description, ''),
    'footerText', COALESCE(locale_row.footer_text, ''),
    'locale', COALESCE(locale_row.locale, store.default_locale),
    'defaultLocale', store.default_locale,
    'currency', store.currency,
    'contactEmail', store.contact_email,
    'contactPhone', store.contact_phone,
    'branding', store.branding_json,
    'settings', store.settings_json,
    'presentation', template_version.presentation_json,
    'template', jsonb_build_object(
      'slug', template.slug,
      'version', template_version.version,
      'rendererKey', template_version.renderer_key
    ),
    'categories', COALESCE(categories.value, '[]'::jsonb),
    'products', COALESCE(products.value, '[]'::jsonb),
    'paymentMethods', COALESCE(payment_methods.value, '[]'::jsonb),
    'shippingMethods', COALESCE(shipping_methods.value, '[]'::jsonb)
  )
  FROM resolve_active_ecommerce_store(p_hostname) resolved
  JOIN ecommerce_stores store
    ON store.organization_id = resolved.organization_id AND store.id = resolved.store_id
  JOIN ecommerce_template_versions template_version
    ON template_version.id = store.ecommerce_template_version_id AND template_version.status = 'ready'
  JOIN ecommerce_templates template
    ON template.id = template_version.template_id AND template.status = 'ready'
  LEFT JOIN LATERAL (
    SELECT locale_record.*
    FROM ecommerce_store_locales locale_record
    WHERE locale_record.store_id = store.id
      AND locale_record.locale = CASE WHEN p_locale IN ('en', 'ar') THEN p_locale ELSE store.default_locale END
    LIMIT 1
  ) locale_row ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', category.id,
      'slug', category.slug,
      'name', COALESCE(translation.name, category.slug),
      'description', COALESCE(translation.description, ''),
      'parentId', category.parent_id
    ) ORDER BY category.position, category.created_at) AS value
    FROM ecommerce_categories category
    LEFT JOIN ecommerce_category_translations translation
      ON translation.category_id = category.id
     AND translation.locale = COALESCE(locale_row.locale, store.default_locale)
    WHERE category.organization_id = store.organization_id
      AND category.store_id = store.id
      AND category.visible
  ) categories ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', product.id,
      'slug', product.slug,
      'name', COALESCE(translation.name, product.slug),
      'shortDescription', COALESCE(translation.short_description, ''),
      'description', COALESCE(translation.description, ''),
      'priceMinor', product.base_price_minor,
      'salePriceMinor', product.sale_price_minor,
      'currency', product.currency,
      'sku', product.sku,
      'attributes', product.attributes_json,
      'images', COALESCE(image_rows.value, '[]'::jsonb),
      'variants', COALESCE(variant_rows.value, '[]'::jsonb),
      'categoryIds', COALESCE(category_rows.value, '[]'::jsonb)
    ) ORDER BY product.created_at DESC) AS value
    FROM ecommerce_products product
    LEFT JOIN ecommerce_product_translations translation
      ON translation.product_id = product.id
     AND translation.locale = COALESCE(locale_row.locale, store.default_locale)
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'id', image.id,
        'filename', asset.storage_key,
        'alt', image.alt_text,
        'primary', image.is_primary
      ) ORDER BY image.position) AS value
      FROM ecommerce_product_images image
      JOIN media_assets asset
        ON asset.organization_id = image.organization_id
       AND asset.id = image.media_asset_id
       AND asset.status = 'ready'
      WHERE image.organization_id = product.organization_id AND image.product_id = product.id
    ) image_rows ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'id', variant.id,
        'title', variant.title,
        'sku', variant.sku,
        'priceMinor', variant.price_minor,
        'salePriceMinor', variant.sale_price_minor,
        'stockQuantity', variant.stock_quantity
      ) ORDER BY variant.position) AS value
      FROM ecommerce_product_variants variant
      WHERE variant.organization_id = product.organization_id
        AND variant.product_id = product.id
        AND variant.active
    ) variant_rows ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(link.category_id) AS value
      FROM ecommerce_product_categories link
      WHERE link.product_id = product.id
    ) category_rows ON true
    WHERE product.organization_id = store.organization_id
      AND product.store_id = store.id
      AND product.status = 'published'
      AND product.visibility = 'public'
      AND product.archived_at IS NULL
  ) products ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', method.id, 'key', method.key, 'name', method.display_name)
      ORDER BY method.position) AS value
    FROM ecommerce_payment_methods method
    WHERE method.organization_id = store.organization_id AND method.store_id = store.id AND method.enabled
  ) payment_methods ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', method.id, 'key', method.key, 'name', method.display_name, 'priceMinor', method.price_minor
    ) ORDER BY method.position) AS value
    FROM ecommerce_shipping_methods method
    WHERE method.organization_id = store.organization_id AND method.store_id = store.id AND method.enabled
  ) shipping_methods ON true;
$$;

REVOKE ALL ON FUNCTION resolve_active_ecommerce_store(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_ecommerce_storefront(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_active_ecommerce_store(text) TO factory_app;
GRANT EXECUTE ON FUNCTION get_ecommerce_storefront(text, text) TO factory_renderer;
