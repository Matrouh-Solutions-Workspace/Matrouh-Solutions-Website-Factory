ALTER TABLE "template_catalog_entries"
  ADD COLUMN "catalog_visible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "catalog_price_minor" INTEGER NOT NULL DEFAULT 25000,
  ADD COLUMN "catalog_currency" VARCHAR(8) NOT NULL DEFAULT 'EGP',
  ADD COLUMN "catalog_billing_period" VARCHAR(24) NOT NULL DEFAULT 'month',
  ADD COLUMN "catalog_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "catalog_sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "catalog_badge" VARCHAR(80),
  ADD COLUMN "catalog_badge_ar" VARCHAR(80),
  ADD COLUMN "catalog_cta_label" VARCHAR(80),
  ADD COLUMN "catalog_cta_label_ar" VARCHAR(80),
  ADD COLUMN "catalog_cta_href" TEXT,
  ADD COLUMN "catalog_sales_description" TEXT,
  ADD COLUMN "catalog_sales_description_ar" TEXT,
  ADD COLUMN "catalog_highlights_json" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "catalog_highlights_ar_json" JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX "template_catalog_entries_public_order_idx"
  ON "template_catalog_entries" ("catalog_visible", "catalog_sort_order", "display_name");

GRANT SELECT, UPDATE ON "template_catalog_entries" TO factory_app;
GRANT SELECT ON "template_catalog_entries" TO factory_renderer;
