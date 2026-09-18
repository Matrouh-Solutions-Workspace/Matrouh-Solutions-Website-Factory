-- Ecommerce documents are rendered by the dashboard gateway after it resolves
-- the hostname against the primary application database. The function remains
-- SECURITY DEFINER and exposes only the already-public storefront projection.
GRANT EXECUTE ON FUNCTION get_ecommerce_storefront(text, text) TO factory_app;
