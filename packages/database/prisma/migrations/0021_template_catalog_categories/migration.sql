ALTER TABLE "template_catalog_entries"
  ADD COLUMN "catalog_category" VARCHAR(80),
  ADD COLUMN "catalog_category_ar" VARCHAR(80);

UPDATE "template_catalog_entries"
SET "catalog_category" = "category"
WHERE "catalog_category" IS NULL;

CREATE INDEX "template_catalog_entries_category_idx"
  ON "template_catalog_entries" ("catalog_category", "catalog_visible", "catalog_sort_order");
