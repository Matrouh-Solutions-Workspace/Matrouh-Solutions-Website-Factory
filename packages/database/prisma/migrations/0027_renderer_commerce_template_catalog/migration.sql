-- The public template catalog is rendered by the restricted renderer role.
-- Commerce template definitions contain presentation metadata only; store,
-- product, order, and tenant data remain behind their existing boundaries.
GRANT SELECT ON ecommerce_templates, ecommerce_template_versions TO factory_renderer;
