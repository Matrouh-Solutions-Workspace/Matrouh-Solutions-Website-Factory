-- CreateEnum
CREATE TYPE "WebsiteKind" AS ENUM ('standard', 'ecommerce');

-- CreateEnum
CREATE TYPE "EcommerceTemplateStatus" AS ENUM ('draft', 'ready', 'deprecated', 'retired');

-- CreateEnum
CREATE TYPE "EcommerceStoreStatus" AS ENUM ('draft', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "EcommerceProductStatus" AS ENUM ('draft', 'published', 'hidden', 'out_of_stock', 'archived');

-- CreateEnum
CREATE TYPE "EcommerceVisibility" AS ENUM ('public', 'unlisted', 'private');

-- CreateEnum
CREATE TYPE "EcommerceCustomerStatus" AS ENUM ('active', 'blocked', 'archived');

-- CreateEnum
CREATE TYPE "EcommerceCartStatus" AS ENUM ('active', 'converted', 'abandoned', 'expired');

-- CreateEnum
CREATE TYPE "EcommerceOrderStatus" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "EcommercePaymentStatus" AS ENUM ('pending', 'authorized', 'paid', 'failed', 'partially_refunded', 'refunded');

-- CreateEnum
CREATE TYPE "EcommerceCouponType" AS ENUM ('percentage', 'fixed', 'product', 'category');

-- AlterTable
ALTER TABLE "websites" ADD COLUMN     "kind" "WebsiteKind" NOT NULL DEFAULT 'standard';

-- CreateTable
CREATE TABLE "ecommerce_templates" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "EcommerceTemplateStatus" NOT NULL DEFAULT 'draft',
    "preview_image_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ecommerce_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_template_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "status" "EcommerceTemplateStatus" NOT NULL DEFAULT 'draft',
    "renderer_key" VARCHAR(160) NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "capabilities_json" JSONB NOT NULL DEFAULT '{}',
    "presentation_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "ecommerce_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_stores" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "owner_user_id" UUID,
    "ecommerce_template_version_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "status" "EcommerceStoreStatus" NOT NULL DEFAULT 'draft',
    "default_locale" VARCHAR(35) NOT NULL DEFAULT 'en',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EGP',
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'Africa/Cairo',
    "logo_asset_id" UUID,
    "contact_email" VARCHAR(320),
    "contact_phone" VARCHAR(50),
    "address_json" JSONB NOT NULL DEFAULT '{}',
    "branding_json" JSONB NOT NULL DEFAULT '{}',
    "settings_json" JSONB NOT NULL DEFAULT '{}',
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "ecommerce_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_store_locales" (
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "store_name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "footer_text" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ecommerce_store_locales_pkey" PRIMARY KEY ("store_id","locale")
);

-- CreateTable
CREATE TABLE "ecommerce_categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "parent_id" UUID,
    "slug" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ecommerce_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_category_translations" (
    "category_id" UUID NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ecommerce_category_translations_pkey" PRIMARY KEY ("category_id","locale")
);

-- CreateTable
CREATE TABLE "ecommerce_products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "status" "EcommerceProductStatus" NOT NULL DEFAULT 'draft',
    "visibility" "EcommerceVisibility" NOT NULL DEFAULT 'public',
    "base_price_minor" INTEGER NOT NULL,
    "sale_price_minor" INTEGER,
    "currency" VARCHAR(3) NOT NULL,
    "sku" VARCHAR(120),
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "weight_grams" INTEGER,
    "dimensions_json" JSONB NOT NULL DEFAULT '{}',
    "attributes_json" JSONB NOT NULL DEFAULT '{}',
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "ecommerce_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_product_translations" (
    "product_id" UUID NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "name" VARCHAR(240) NOT NULL,
    "short_description" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "seo_title" VARCHAR(240),
    "seo_description" TEXT,

    CONSTRAINT "ecommerce_product_translations_pkey" PRIMARY KEY ("product_id","locale")
);

-- CreateTable
CREATE TABLE "ecommerce_product_images" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "alt_text" VARCHAR(300) NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ecommerce_product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_product_options" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ecommerce_product_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_product_option_values" (
    "id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "value" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ecommerce_product_option_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_product_variants" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(120),
    "title" VARCHAR(240) NOT NULL,
    "price_minor" INTEGER,
    "sale_price_minor" INTEGER,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "image_asset_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ecommerce_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_variant_option_values" (
    "variant_id" UUID NOT NULL,
    "option_value_id" UUID NOT NULL,

    CONSTRAINT "ecommerce_variant_option_values_pkey" PRIMARY KEY ("variant_id","option_value_id")
);

-- CreateTable
CREATE TABLE "ecommerce_product_categories" (
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "ecommerce_product_categories_pkey" PRIMARY KEY ("product_id","category_id")
);

-- CreateTable
CREATE TABLE "ecommerce_inventory_adjustments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "quantity_delta" INTEGER NOT NULL,
    "reason" VARCHAR(80) NOT NULL,
    "reference_type" VARCHAR(80),
    "reference_id" VARCHAR(160),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerce_inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(50),
    "status" "EcommerceCustomerStatus" NOT NULL DEFAULT 'active',
    "address_json" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ecommerce_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_carts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "customer_id" UUID,
    "session_key_hash" VARCHAR(128) NOT NULL,
    "status" "EcommerceCartStatus" NOT NULL DEFAULT 'active',
    "currency" VARCHAR(3) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ecommerce_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ecommerce_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "customer_id" UUID,
    "order_number" VARCHAR(80) NOT NULL,
    "status" "EcommerceOrderStatus" NOT NULL DEFAULT 'pending',
    "payment_status" "EcommercePaymentStatus" NOT NULL DEFAULT 'pending',
    "currency" VARCHAR(3) NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,
    "discount_minor" INTEGER NOT NULL DEFAULT 0,
    "shipping_minor" INTEGER NOT NULL DEFAULT 0,
    "tax_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER NOT NULL,
    "customer_snapshot" JSONB NOT NULL,
    "shipping_address" JSONB NOT NULL,
    "billing_address" JSONB NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ecommerce_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "sku" VARCHAR(120),
    "product_name" VARCHAR(240) NOT NULL,
    "variant_name" VARCHAR(240),
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "discount_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER NOT NULL,

    CONSTRAINT "ecommerce_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_payment_methods" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "provider_key" VARCHAR(120),
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "config_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ecommerce_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_order_payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_method_id" UUID NOT NULL,
    "provider_reference" VARCHAR(240),
    "status" "EcommercePaymentStatus" NOT NULL DEFAULT 'pending',
    "amount_minor" INTEGER NOT NULL,
    "provider_result_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ecommerce_order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_shipping_methods" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "price_minor" INTEGER NOT NULL DEFAULT 0,
    "config_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ecommerce_shipping_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_coupons" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "type" "EcommerceCouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minimum_order_minor" INTEGER,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ecommerce_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_coupon_products" (
    "coupon_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,

    CONSTRAINT "ecommerce_coupon_products_pkey" PRIMARY KEY ("coupon_id","product_id")
);

-- CreateTable
CREATE TABLE "ecommerce_coupon_categories" (
    "coupon_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "ecommerce_coupon_categories_pkey" PRIMARY KEY ("coupon_id","category_id")
);

-- CreateTable
CREATE TABLE "ecommerce_coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "discount_minor" INTEGER NOT NULL,
    "redeemed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerce_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_analytics_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "event_type" VARCHAR(120) NOT NULL,
    "session_hash" VARCHAR(128),
    "data_json" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerce_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_templates_slug_key" ON "ecommerce_templates"("slug");

-- CreateIndex
CREATE INDEX "ecommerce_template_versions_status_published_at_idx" ON "ecommerce_template_versions"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_template_versions_template_id_version_key" ON "ecommerce_template_versions"("template_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_stores_website_id_key" ON "ecommerce_stores"("website_id");

-- CreateIndex
CREATE INDEX "ecommerce_stores_organization_id_owner_user_id_status_idx" ON "ecommerce_stores"("organization_id", "owner_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_stores_organization_id_id_key" ON "ecommerce_stores"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_stores_organization_id_website_id_key" ON "ecommerce_stores"("organization_id", "website_id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_stores_organization_id_slug_key" ON "ecommerce_stores"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "ecommerce_store_locales_organization_id_store_id_idx" ON "ecommerce_store_locales"("organization_id", "store_id");

-- CreateIndex
CREATE INDEX "ecommerce_categories_organization_id_store_id_position_idx" ON "ecommerce_categories"("organization_id", "store_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_categories_organization_id_id_key" ON "ecommerce_categories"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_categories_store_id_slug_key" ON "ecommerce_categories"("store_id", "slug");

-- CreateIndex
CREATE INDEX "ecommerce_products_organization_id_store_id_status_visibili_idx" ON "ecommerce_products"("organization_id", "store_id", "status", "visibility");

-- CreateIndex
CREATE INDEX "ecommerce_products_store_id_sku_idx" ON "ecommerce_products"("store_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_products_organization_id_id_key" ON "ecommerce_products"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_products_store_id_slug_key" ON "ecommerce_products"("store_id", "slug");

-- CreateIndex
CREATE INDEX "ecommerce_product_translations_locale_name_idx" ON "ecommerce_product_translations"("locale", "name");

-- CreateIndex
CREATE INDEX "ecommerce_product_images_product_id_position_idx" ON "ecommerce_product_images"("product_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_product_images_product_id_media_asset_id_key" ON "ecommerce_product_images"("product_id", "media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_product_options_product_id_name_key" ON "ecommerce_product_options"("product_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_product_option_values_option_id_value_key" ON "ecommerce_product_option_values"("option_id", "value");

-- CreateIndex
CREATE INDEX "ecommerce_product_variants_product_id_position_idx" ON "ecommerce_product_variants"("product_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_product_variants_organization_id_id_key" ON "ecommerce_product_variants"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_product_variants_product_id_sku_key" ON "ecommerce_product_variants"("product_id", "sku");

-- CreateIndex
CREATE INDEX "ecommerce_inventory_adjustments_organization_id_store_id_cr_idx" ON "ecommerce_inventory_adjustments"("organization_id", "store_id", "created_at");

-- CreateIndex
CREATE INDEX "ecommerce_inventory_adjustments_variant_id_created_at_idx" ON "ecommerce_inventory_adjustments"("variant_id", "created_at");

-- CreateIndex
CREATE INDEX "ecommerce_customers_organization_id_store_id_email_idx" ON "ecommerce_customers"("organization_id", "store_id", "email");

-- CreateIndex
CREATE INDEX "ecommerce_customers_store_id_phone_idx" ON "ecommerce_customers"("store_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_customers_organization_id_id_key" ON "ecommerce_customers"("organization_id", "id");

-- CreateIndex
CREATE INDEX "ecommerce_carts_organization_id_store_id_status_expires_at_idx" ON "ecommerce_carts"("organization_id", "store_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_carts_store_id_session_key_hash_key" ON "ecommerce_carts"("store_id", "session_key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_cart_items_cart_id_variant_id_key" ON "ecommerce_cart_items"("cart_id", "variant_id");

-- CreateIndex
CREATE INDEX "ecommerce_orders_organization_id_store_id_status_created_at_idx" ON "ecommerce_orders"("organization_id", "store_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "ecommerce_orders_store_id_payment_status_created_at_idx" ON "ecommerce_orders"("store_id", "payment_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_orders_organization_id_id_key" ON "ecommerce_orders"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_orders_store_id_order_number_key" ON "ecommerce_orders"("store_id", "order_number");

-- CreateIndex
CREATE INDEX "ecommerce_order_items_order_id_idx" ON "ecommerce_order_items"("order_id");

-- CreateIndex
CREATE INDEX "ecommerce_payment_methods_organization_id_store_id_enabled_idx" ON "ecommerce_payment_methods"("organization_id", "store_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_payment_methods_store_id_key_key" ON "ecommerce_payment_methods"("store_id", "key");

-- CreateIndex
CREATE INDEX "ecommerce_order_payments_order_id_status_idx" ON "ecommerce_order_payments"("order_id", "status");

-- CreateIndex
CREATE INDEX "ecommerce_shipping_methods_organization_id_store_id_enabled_idx" ON "ecommerce_shipping_methods"("organization_id", "store_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_shipping_methods_store_id_key_key" ON "ecommerce_shipping_methods"("store_id", "key");

-- CreateIndex
CREATE INDEX "ecommerce_coupons_organization_id_store_id_enabled_idx" ON "ecommerce_coupons"("organization_id", "store_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_coupons_store_id_code_key" ON "ecommerce_coupons"("store_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_coupon_redemptions_coupon_id_order_id_key" ON "ecommerce_coupon_redemptions"("coupon_id", "order_id");

-- CreateIndex
CREATE INDEX "ecommerce_analytics_events_organization_id_store_id_event_t_idx" ON "ecommerce_analytics_events"("organization_id", "store_id", "event_type", "occurred_at");

-- AddForeignKey
ALTER TABLE "ecommerce_template_versions" ADD CONSTRAINT "ecommerce_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ecommerce_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_stores" ADD CONSTRAINT "ecommerce_stores_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_stores" ADD CONSTRAINT "ecommerce_stores_organization_id_website_id_fkey" FOREIGN KEY ("organization_id", "website_id") REFERENCES "websites"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_stores" ADD CONSTRAINT "ecommerce_stores_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_stores" ADD CONSTRAINT "ecommerce_stores_ecommerce_template_version_id_fkey" FOREIGN KEY ("ecommerce_template_version_id") REFERENCES "ecommerce_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_stores" ADD CONSTRAINT "ecommerce_stores_organization_id_logo_asset_id_fkey" FOREIGN KEY ("organization_id", "logo_asset_id") REFERENCES "media_assets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_store_locales" ADD CONSTRAINT "ecommerce_store_locales_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_categories" ADD CONSTRAINT "ecommerce_categories_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_categories" ADD CONSTRAINT "ecommerce_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ecommerce_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_category_translations" ADD CONSTRAINT "ecommerce_category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ecommerce_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_products" ADD CONSTRAINT "ecommerce_products_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_translations" ADD CONSTRAINT "ecommerce_product_translations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ecommerce_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_images" ADD CONSTRAINT "ecommerce_product_images_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "ecommerce_products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_images" ADD CONSTRAINT "ecommerce_product_images_organization_id_media_asset_id_fkey" FOREIGN KEY ("organization_id", "media_asset_id") REFERENCES "media_assets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_options" ADD CONSTRAINT "ecommerce_product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ecommerce_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_option_values" ADD CONSTRAINT "ecommerce_product_option_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "ecommerce_product_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_variants" ADD CONSTRAINT "ecommerce_product_variants_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "ecommerce_products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_variants" ADD CONSTRAINT "ecommerce_product_variants_organization_id_image_asset_id_fkey" FOREIGN KEY ("organization_id", "image_asset_id") REFERENCES "media_assets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_variant_option_values" ADD CONSTRAINT "ecommerce_variant_option_values_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ecommerce_product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_variant_option_values" ADD CONSTRAINT "ecommerce_variant_option_values_option_value_id_fkey" FOREIGN KEY ("option_value_id") REFERENCES "ecommerce_product_option_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_categories" ADD CONSTRAINT "ecommerce_product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ecommerce_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_product_categories" ADD CONSTRAINT "ecommerce_product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ecommerce_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_inventory_adjustments" ADD CONSTRAINT "ecommerce_inventory_adjustments_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_inventory_adjustments" ADD CONSTRAINT "ecommerce_inventory_adjustments_organization_id_variant_id_fkey" FOREIGN KEY ("organization_id", "variant_id") REFERENCES "ecommerce_product_variants"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_inventory_adjustments" ADD CONSTRAINT "ecommerce_inventory_adjustments_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_customers" ADD CONSTRAINT "ecommerce_customers_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_carts" ADD CONSTRAINT "ecommerce_carts_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_carts" ADD CONSTRAINT "ecommerce_carts_organization_id_customer_id_fkey" FOREIGN KEY ("organization_id", "customer_id") REFERENCES "ecommerce_customers"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_cart_items" ADD CONSTRAINT "ecommerce_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "ecommerce_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_cart_items" ADD CONSTRAINT "ecommerce_cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ecommerce_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_cart_items" ADD CONSTRAINT "ecommerce_cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ecommerce_product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_organization_id_customer_id_fkey" FOREIGN KEY ("organization_id", "customer_id") REFERENCES "ecommerce_customers"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_order_items" ADD CONSTRAINT "ecommerce_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ecommerce_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_order_items" ADD CONSTRAINT "ecommerce_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ecommerce_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_order_items" ADD CONSTRAINT "ecommerce_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ecommerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_payment_methods" ADD CONSTRAINT "ecommerce_payment_methods_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_order_payments" ADD CONSTRAINT "ecommerce_order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ecommerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_order_payments" ADD CONSTRAINT "ecommerce_order_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "ecommerce_payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_shipping_methods" ADD CONSTRAINT "ecommerce_shipping_methods_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupons" ADD CONSTRAINT "ecommerce_coupons_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_products" ADD CONSTRAINT "ecommerce_coupon_products_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "ecommerce_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_products" ADD CONSTRAINT "ecommerce_coupon_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ecommerce_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_categories" ADD CONSTRAINT "ecommerce_coupon_categories_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "ecommerce_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_categories" ADD CONSTRAINT "ecommerce_coupon_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ecommerce_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_redemptions" ADD CONSTRAINT "ecommerce_coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "ecommerce_coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_redemptions" ADD CONSTRAINT "ecommerce_coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ecommerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_analytics_events" ADD CONSTRAINT "ecommerce_analytics_events_organization_id_store_id_fkey" FOREIGN KEY ("organization_id", "store_id") REFERENCES "ecommerce_stores"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Commerce invariants are enforced in the database as well as in the domain layer.
ALTER TABLE "ecommerce_products" ADD CONSTRAINT "ecommerce_products_prices_check"
  CHECK ("base_price_minor" >= 0 AND ("sale_price_minor" IS NULL OR "sale_price_minor" >= 0));
ALTER TABLE "ecommerce_product_variants" ADD CONSTRAINT "ecommerce_product_variants_prices_check"
  CHECK (("price_minor" IS NULL OR "price_minor" >= 0) AND ("sale_price_minor" IS NULL OR "sale_price_minor" >= 0));
ALTER TABLE "ecommerce_cart_items" ADD CONSTRAINT "ecommerce_cart_items_quantity_check"
  CHECK ("quantity" > 0 AND "unit_price_minor" >= 0);
ALTER TABLE "ecommerce_order_items" ADD CONSTRAINT "ecommerce_order_items_amounts_check"
  CHECK ("quantity" > 0 AND "unit_price_minor" >= 0 AND "discount_minor" >= 0 AND "total_minor" >= 0);
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_amounts_check"
  CHECK ("subtotal_minor" >= 0 AND "discount_minor" >= 0 AND "shipping_minor" >= 0 AND "tax_minor" >= 0 AND "total_minor" >= 0);
ALTER TABLE "ecommerce_coupons" ADD CONSTRAINT "ecommerce_coupons_value_check"
  CHECK ("value" > 0 AND "used_count" >= 0 AND ("usage_limit" IS NULL OR "usage_limit" > 0));

-- Direct tenant tables use the standard organization session variable.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ecommerce_stores', 'ecommerce_store_locales', 'ecommerce_categories',
    'ecommerce_products', 'ecommerce_product_images', 'ecommerce_product_variants',
    'ecommerce_inventory_adjustments', 'ecommerce_customers', 'ecommerce_carts',
    'ecommerce_orders', 'ecommerce_payment_methods', 'ecommerce_shipping_methods',
    'ecommerce_coupons', 'ecommerce_analytics_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;

-- Child tables deliberately avoid duplicated tenant identifiers. Their policies
-- derive tenant ownership from the closest aggregate root.
ALTER TABLE "ecommerce_category_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_category_translations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_category_translations" USING (EXISTS (
  SELECT 1 FROM ecommerce_categories parent WHERE parent.id = category_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_categories parent WHERE parent.id = category_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_product_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_product_translations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_product_translations" USING (EXISTS (
  SELECT 1 FROM ecommerce_products parent WHERE parent.id = product_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_products parent WHERE parent.id = product_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_product_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_product_options" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_product_options" USING (EXISTS (
  SELECT 1 FROM ecommerce_products parent WHERE parent.id = product_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_products parent WHERE parent.id = product_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_product_option_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_product_option_values" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_product_option_values" USING (EXISTS (
  SELECT 1 FROM ecommerce_product_options option_row
  JOIN ecommerce_products product ON product.id = option_row.product_id
  WHERE option_row.id = option_id
    AND product.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_product_options option_row
  JOIN ecommerce_products product ON product.id = option_row.product_id
  WHERE option_row.id = option_id
    AND product.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_variant_option_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_variant_option_values" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_variant_option_values" USING (EXISTS (
  SELECT 1 FROM ecommerce_product_variants variant WHERE variant.id = variant_id
    AND variant.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_product_variants variant WHERE variant.id = variant_id
    AND variant.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_product_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_product_categories" USING (EXISTS (
  SELECT 1 FROM ecommerce_products product WHERE product.id = product_id
    AND product.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_products product WHERE product.id = product_id
    AND product.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_cart_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_cart_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_cart_items" USING (EXISTS (
  SELECT 1 FROM ecommerce_carts cart WHERE cart.id = cart_id
    AND cart.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_carts cart WHERE cart.id = cart_id
    AND cart.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_order_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_order_items" USING (EXISTS (
  SELECT 1 FROM ecommerce_orders parent WHERE parent.id = order_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_orders parent WHERE parent.id = order_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_order_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_order_payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_order_payments" USING (EXISTS (
  SELECT 1 FROM ecommerce_orders parent WHERE parent.id = order_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_orders parent WHERE parent.id = order_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_coupon_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_coupon_products" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_coupon_products" USING (EXISTS (
  SELECT 1 FROM ecommerce_coupons coupon WHERE coupon.id = coupon_id
    AND coupon.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_coupons coupon WHERE coupon.id = coupon_id
    AND coupon.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_coupon_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_coupon_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_coupon_categories" USING (EXISTS (
  SELECT 1 FROM ecommerce_coupons coupon WHERE coupon.id = coupon_id
    AND coupon.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_coupons coupon WHERE coupon.id = coupon_id
    AND coupon.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

ALTER TABLE "ecommerce_coupon_redemptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecommerce_coupon_redemptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecommerce_coupon_redemptions" USING (EXISTS (
  SELECT 1 FROM ecommerce_orders parent WHERE parent.id = order_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM ecommerce_orders parent WHERE parent.id = order_id
    AND parent.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));

GRANT SELECT ON ecommerce_templates, ecommerce_template_versions TO factory_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  ecommerce_stores, ecommerce_store_locales, ecommerce_categories,
  ecommerce_category_translations, ecommerce_products, ecommerce_product_translations,
  ecommerce_product_images, ecommerce_product_options, ecommerce_product_option_values,
  ecommerce_product_variants, ecommerce_variant_option_values, ecommerce_product_categories,
  ecommerce_inventory_adjustments, ecommerce_customers, ecommerce_carts, ecommerce_cart_items,
  ecommerce_orders, ecommerce_order_items, ecommerce_payment_methods, ecommerce_order_payments,
  ecommerce_shipping_methods, ecommerce_coupons, ecommerce_coupon_products,
  ecommerce_coupon_categories, ecommerce_coupon_redemptions, ecommerce_analytics_events
TO factory_app;

-- A first-class commerce template is seeded separately from the website template catalog.
INSERT INTO ecommerce_templates (id, slug, name, description, status, created_at, updated_at)
VALUES (
  'ec000000-0000-4000-8000-000000000001', 'general-store', 'General Store',
  'A bilingual, responsive storefront for general product catalogs.', 'ready',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO ecommerce_template_versions (
  id, template_id, version, status, renderer_key, schema_version,
  capabilities_json, presentation_json, created_at, published_at
)
VALUES (
  'ec000000-0000-4000-8000-000000000002',
  (SELECT id FROM ecommerce_templates WHERE slug = 'general-store'),
  '1.0.0', 'ready', 'general-store', 1,
  '{"bilingual":true,"catalog":true,"cart":true,"checkout":true,"customerAccounts":false}'::jsonb,
  '{"layout":"marketplace","tokens":{"primary":"#111827","accent":"#ea580c","surface":"#ffffff","radius":"14px"},"sections":["hero","categories","featuredProducts","benefits","footer"]}'::jsonb,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (template_id, version) DO NOTHING;
