"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertMinorAmount,
  assertOrderTransition,
  normalizeCouponCode,
  normalizeStoreSlug,
  type OrderStatus,
} from "@factory/ecommerce";
import { withTenantTransaction } from "@factory/database";
import { dashboardDatabase } from "@/server/database";
import { ecommerceContentFields } from "@/server/ecommerce-content";
import { DashboardAuthorizationError } from "@/server/auth";
import {
  loadEcommerceTemplates,
  requireCommerceAdministrator,
  requireEcommerceStoreContext,
} from "@/server/ecommerce";

export async function createEcommerceStoreAction(formData: FormData): Promise<void> {
  const context = await requireCommerceAdministrator();
  const name = text(formData, "name", 200);
  let slug: string;
  try {
    slug = normalizeStoreSlug(text(formData, "slug", 120) || name);
  } catch {
    redirect("/ecommerce?createError=invalid#new-commerce-store");
  }
  const hostname = normalizeHostname(text(formData, "hostname", 253) || `${slug}.localhost`);
  const templateVersionId = text(formData, "templateVersionId", 80);
  const contactPhone = text(formData, "contactPhone", 50);
  const defaultLocale = text(formData, "defaultLocale", 35) === "ar" ? "ar" : "en";
  const currency = text(formData, "currency", 3).toUpperCase() || "EGP";
  if (!name || !templateVersionId || !hostname || !contactPhone || !/^[A-Z]{3}$/.test(currency)) {
    redirect("/ecommerce?createError=invalid#new-commerce-store");
  }

  const websiteId = randomUUID();
  const storeId = randomUUID();
  try {
    await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: `ecommerce:create-store:${storeId}`,
      },
      async (transaction) => {
        const templateVersion = await transaction.ecommerceTemplateVersion.findFirst({
          where: { id: templateVersionId, status: "ready" },
          include: { template: true },
        });
        if (!templateVersion) throw new Error("ECOMMERCE_TEMPLATE_NOT_READY");
        await transaction.website.create({
          data: {
            id: websiteId,
            organizationId: context.organization.id,
            name,
            kind: "ecommerce",
            status: "draft",
            templateId: `ecommerce:${templateVersion.template.slug}`,
            templateVersion: templateVersion.version,
            defaultLocale,
            locales: {
              create: [
                {
                  locale: defaultLocale,
                  isDefault: true,
                },
                {
                  locale: defaultLocale === "en" ? "ar" : "en",
                  isDefault: false,
                  fallbackLocale: defaultLocale,
                },
              ],
            },
            domains: {
              create: {
                id: randomUUID(),
                hostnameNormalized: hostname,
                hostnameDisplay: hostname,
                rootHostname: hostname,
                kind: hostname.endsWith(".localhost") ? "subdomain" : "custom",
                status: "active",
              },
            },
          },
        });
        await transaction.ecommerceStore.create({
          data: {
            id: storeId,
            organizationId: context.organization.id,
            websiteId,
            ecommerceTemplateVersionId: templateVersion.id,
            name,
            slug,
            defaultLocale,
            currency,
            contactPhone,
            locales: {
              create: [
                {
                  locale: "en",
                  isDefault: defaultLocale === "en",
                  storeName: name,
                },
                {
                  locale: "ar",
                  isDefault: defaultLocale === "ar",
                  storeName: name,
                },
              ],
            },
            paymentMethods: {
              create: [
                {
                  id: randomUUID(),
                  key: "cash_on_delivery",
                  displayName: "Cash on delivery",
                  enabled: true,
                  position: 0,
                },
              ],
            },
            shippingMethods: {
              create: [
                {
                  id: randomUUID(),
                  key: "standard_delivery",
                  displayName: "Standard delivery",
                  enabled: true,
                  position: 0,
                  priceMinor: 0,
                },
                {
                  id: randomUUID(),
                  key: "store_pickup",
                  displayName: "Store pickup",
                  enabled: true,
                  position: 1,
                  priceMinor: 0,
                },
              ],
            },
          },
        });
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            actorType: "user",
            actorId: context.actor.id,
            action: "ecommerce.store_created",
            resourceType: "ecommerce_store",
            resourceId: storeId,
            correlationId: `ecommerce:create-store:${storeId}`,
            metadataJson: { websiteId, hostname, templateVersionId },
            retentionClass: "standard",
          },
        });
      },
    );
  } catch (error) {
    console.error("Failed to create ecommerce store", {
      cause: error,
      organizationId: context.organization.id,
      storeId,
    });
    redirect(
      `/ecommerce?createError=${isUniqueConstraintError(error) ? "conflict" : "failed"}#new-commerce-store`,
    );
  }
  redirect(`/ecommerce/stores/${storeId}`);
}

export async function deleteEcommerceStoreAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const context = await requireCommerceAdministrator();
  const now = new Date();
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:archive-store:${storeId}`),
    async (transaction) => {
      const store = await transaction.ecommerceStore.findFirst({
        where: {
          id: storeId,
          organizationId: context.organization.id,
          archivedAt: null,
        },
        select: { id: true, websiteId: true, name: true },
      });
      if (!store) throw new Error("ECOMMERCE_STORE_NOT_FOUND");

      await transaction.ecommerceStore.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: storeId } },
        data: { status: "archived", archivedAt: now, revision: { increment: 1 } },
      });
      await transaction.website.update({
        where: {
          organizationId_id: {
            organizationId: context.organization.id,
            id: store.websiteId,
          },
        },
        data: {
          status: "archived",
          archivedAt: now,
          activePublicationId: null,
          revision: { increment: 1 },
        },
      });
      await transaction.domain.updateMany({
        where: {
          organizationId: context.organization.id,
          websiteId: store.websiteId,
          releasedAt: null,
        },
        data: { status: "disconnected", releasedAt: now, revision: { increment: 1 } },
      });
      await transaction.websiteSubscription.updateMany({
        where: { organizationId: context.organization.id, websiteId: store.websiteId },
        data: {
          status: "cancelled",
          disabledAt: now,
          disabledReason: "store_archived",
          resumeStatus: null,
        },
      });
      await transaction.auditEvent.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          actorType: "user",
          actorId: context.actor.id,
          action: "ecommerce.store_archived",
          resourceType: "ecommerce_store",
          resourceId: storeId,
          correlationId: `ecommerce:archive-store:${storeId}`,
          metadataJson: { websiteId: store.websiteId, name: store.name },
          retentionClass: "standard",
        },
      });
    },
  );
  revalidatePath("/ecommerce", "layout");
  revalidatePath("/websites", "layout");
  revalidatePath("/clients", "layout");
}

export async function updateEcommerceStoreAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const { context } = await requireEcommerceStoreContext(storeId);
  const name = text(formData, "name", 200);
  const defaultLocale = text(formData, "defaultLocale", 35) === "ar" ? "ar" : "en";
  const statusInput = text(formData, "status", 20);
  const status = ["draft", "active", "paused"].includes(statusInput)
    ? (statusInput as "draft" | "active" | "paused")
    : "draft";
  const contactEmail = text(formData, "contactEmail", 320) || null;
  const contactPhone = text(formData, "contactPhone", 50) || null;
  const primaryColor = colorField(formData, "primaryColor", "#171512");
  const accentColor = colorField(formData, "accentColor", "#a45f3f");
  const surfaceColor = colorField(formData, "surfaceColor", "#f8f6f1");
  const whatsappEnabled = formData.get("whatsappEnabled") === "on";
  const whatsappButtonLabel = text(formData, "whatsappButtonLabel", 100) || null;
  if (!name) return;
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:update-store:${storeId}`),
    async (transaction) => {
      const current = await transaction.ecommerceStore.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: storeId } },
        select: { brandingJson: true, settingsJson: true },
      });
      const branding = jsonRecord(current?.brandingJson);
      const settings = jsonRecord(current?.settingsJson);
      await transaction.ecommerceStore.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: storeId } },
        data: {
          name,
          defaultLocale,
          status,
          contactEmail,
          contactPhone,
          brandingJson: {
            ...branding,
            tokens: {
              ...jsonRecord(branding.tokens),
              primary: primaryColor,
              accent: accentColor,
              surface: surfaceColor,
            },
          },
          settingsJson: { ...settings, whatsappEnabled, whatsappButtonLabel },
          revision: { increment: 1 },
          locales: {
            updateMany: [
              { where: { locale: "en" }, data: { isDefault: defaultLocale === "en" } },
              { where: { locale: "ar" }, data: { isDefault: defaultLocale === "ar" } },
            ],
          },
          website: {
            update: {
              name,
              kind: "ecommerce",
              status: status === "active" ? "published" : "draft",
              defaultLocale,
              revision: { increment: 1 },
            },
          },
        },
      });
    },
  );
  refreshStore(storeId);
}

export async function updateEcommerceContentAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const locale = text(formData, "locale", 2) === "ar" ? "ar" : "en";
  const { context } = await requireEcommerceStoreContext(storeId);
  const content = Object.fromEntries(
    ecommerceContentFields
      .map((field) => [field, text(formData, field, 5000)] as const)
      .filter(([, value]) => value !== ""),
  );
  const heroMediaId = text(formData, "heroMediaId", 80);
  const logoMediaId = text(formData, "logoMediaId", 80);
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:update-content:${storeId}:${locale}`),
    async (transaction) => {
      const current = await transaction.ecommerceStore.findUnique({
        where: { organizationId_id: { organizationId: context.organization.id, id: storeId } },
        select: { settingsJson: true },
      });
      if (!current) throw new Error("ECOMMERCE_STORE_NOT_FOUND");
      const mediaIds = [heroMediaId, logoMediaId].filter(Boolean);
      const media = mediaIds.length
        ? await transaction.mediaAsset.findMany({
            where: {
              organizationId: context.organization.id,
              id: { in: mediaIds },
              status: "ready",
              kind: "image",
            },
            select: { id: true, storageKey: true },
          })
        : [];
      const mediaById = new Map(media.map((asset) => [asset.id, asset.storageKey]));
      const settings = jsonRecord(current.settingsJson);
      const localizedContent = jsonRecord(settings.content);
      await transaction.ecommerceStore.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: storeId } },
        data: {
          settingsJson: {
            ...settings,
            content: { ...localizedContent, [locale]: content },
            ...(mediaById.has(heroMediaId)
              ? { heroMediaId, heroImageFilename: mediaById.get(heroMediaId) }
              : {}),
            ...(mediaById.has(logoMediaId)
              ? { logoMediaId, logoImageFilename: mediaById.get(logoMediaId) }
              : {}),
          } as never,
          revision: { increment: 1 },
        },
      });
    },
  );
  refreshStore(storeId);
  revalidatePath(`/account/ecommerce/stores/${storeId}/content`);
  revalidatePath(`/ecommerce/stores/${storeId}/content`);
}

export async function switchEcommerceTemplateAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const templateVersionId = requiredId(formData, "templateVersionId");
  const { context, administrator } = await requireEcommerceStoreContext(storeId);
  if (!administrator) throw new DashboardAuthorizationError("ecommerce.admin");
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:switch-template:${storeId}`),
    async (transaction) => {
      const template = await transaction.ecommerceTemplateVersion.findFirst({
        where: { id: templateVersionId, status: "ready" },
        include: { template: true },
      });
      if (!template) throw new Error("ECOMMERCE_TEMPLATE_NOT_READY");
      const store = await transaction.ecommerceStore.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: storeId } },
        data: { ecommerceTemplateVersionId: template.id, revision: { increment: 1 } },
        select: { websiteId: true },
      });
      await transaction.website.update({
        where: {
          organizationId_id: { organizationId: context.organization.id, id: store.websiteId },
        },
        data: {
          templateId: `ecommerce:${template.template.slug}`,
          templateVersion: template.version,
          revision: { increment: 1 },
        },
      });
    },
  );
  refreshStore(storeId);
}

export async function createEcommerceCategoryAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const { context } = await requireEcommerceStoreContext(storeId);
  const nameEn = text(formData, "nameEn", 200);
  const nameAr = text(formData, "nameAr", 200) || nameEn;
  if (!nameEn) return;
  const requestedSlug = normalizeStoreSlug(text(formData, "slug", 160) || nameEn);
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:create-category:${storeId}`),
    async (transaction) => {
      const position = await transaction.ecommerceCategory.count({ where: { storeId } });
      let slug = requestedSlug;
      let suffix = 2;
      while (
        await transaction.ecommerceCategory.findFirst({
          where: { storeId, slug },
          select: { id: true },
        })
      ) {
        slug = `${requestedSlug.slice(0, 154)}-${suffix}`;
        suffix += 1;
      }
      await transaction.ecommerceCategory.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          storeId,
          slug,
          position,
          translations: {
            create: [
              { locale: "en", name: nameEn },
              { locale: "ar", name: nameAr },
            ],
          },
        },
      });
    },
  );
  refreshStore(storeId);
}

export async function createEcommerceProductAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const { context } = await requireEcommerceStoreContext(storeId);
  const nameEn = text(formData, "nameEn", 240);
  const nameAr = text(formData, "nameAr", 240) || nameEn;
  const shortDescriptionEn = text(formData, "shortDescriptionEn", 5000);
  const shortDescriptionAr = text(formData, "shortDescriptionAr", 5000) || shortDescriptionEn;
  const descriptionEn = text(formData, "descriptionEn", 5000);
  const descriptionAr = text(formData, "descriptionAr", 5000) || descriptionEn;
  const imageMediaId = text(formData, "imageMediaId", 80) || null;
  const imageAltText = text(formData, "imageAltText", 300);
  const colors = formData
    .getAll("colors")
    .flatMap((value) => (typeof value === "string" ? value.split(/[\s,;]+/) : []))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^#[0-9a-f]{6}$/i.test(value))
    .slice(0, 12);
  const sku = text(formData, "sku", 120) || null;
  const priceMinor = amountField(formData, "price");
  const stockQuantity = integerField(formData, "stockQuantity", 0);
  const categoryId = text(formData, "categoryId", 80) || null;
  if (!nameEn) return;
  const requestedSlug = normalizeStoreSlug(text(formData, "slug", 180) || nameEn);
  const productId = randomUUID();
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:create-product:${productId}`),
    async (transaction) => {
      if (imageMediaId) {
        const imageAsset = await transaction.mediaAsset.count({
          where: {
            id: imageMediaId,
            organizationId: context.organization.id,
            status: "ready",
            kind: "image",
          },
        });
        if (imageAsset !== 1) throw new Error("ECOMMERCE_IMAGE_NOT_FOUND");
      }
      if (categoryId) {
        const category = await transaction.ecommerceCategory.count({
          where: { id: categoryId, organizationId: context.organization.id, storeId },
        });
        if (category !== 1) throw new Error("ECOMMERCE_CATEGORY_NOT_FOUND");
      }
      let slug = requestedSlug;
      let suffix = 2;
      while (
        await transaction.ecommerceProduct.findFirst({
          where: { storeId, slug },
          select: { id: true },
        })
      ) {
        slug = `${requestedSlug.slice(0, 174)}-${suffix}`;
        suffix += 1;
      }
      await transaction.ecommerceProduct.create({
        data: {
          id: productId,
          organizationId: context.organization.id,
          storeId,
          slug,
          status: formData.get("published") === "on" ? "published" : "draft",
          visibility: "public",
          basePriceMinor: priceMinor,
          currency: text(formData, "currency", 3).toUpperCase() || "EGP",
          sku,
          attributesJson: colors.length ? { colors } : {},
          translations: {
            create: [
              {
                locale: "en",
                name: nameEn,
                shortDescription: shortDescriptionEn,
                description: descriptionEn,
              },
              {
                locale: "ar",
                name: nameAr,
                shortDescription: shortDescriptionAr,
                description: descriptionAr,
              },
            ],
          },
          variants: {
            create: {
              id: randomUUID(),
              sku,
              title: "Default",
              stockQuantity,
              active: true,
            },
          },
          ...(categoryId ? { categories: { create: { categoryId } } } : {}),
          ...(imageMediaId
            ? {
                images: {
                  create: {
                    id: randomUUID(),
                    mediaAssetId: imageMediaId,
                    altText: imageAltText,
                    isPrimary: true,
                    position: 0,
                  },
                },
              }
            : {}),
        },
      });
    },
  );
  refreshStore(storeId);
}

export async function toggleEcommerceProductStatusAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const productId = requiredId(formData, "productId");
  const nextStatus = text(formData, "status", 20) === "published" ? "published" : "draft";
  const { context } = await requireEcommerceStoreContext(storeId);
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:product-status:${productId}`),
    async (transaction) => {
      await transaction.ecommerceProduct.updateMany({
        where: {
          id: productId,
          organizationId: context.organization.id,
          storeId,
          archivedAt: null,
        },
        data: { status: nextStatus },
      });
    },
  );
  refreshStore(storeId);
}

export async function updateEcommerceProductAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const productId = requiredId(formData, "productId");
  const nameEn = text(formData, "nameEn", 240);
  if (!nameEn) return;
  const nameAr = text(formData, "nameAr", 240) || nameEn;
  const descriptionEn = text(formData, "descriptionEn", 5000);
  const descriptionAr = text(formData, "descriptionAr", 5000) || descriptionEn;
  const shortDescriptionEn = text(formData, "shortDescriptionEn", 5000);
  const shortDescriptionAr = text(formData, "shortDescriptionAr", 5000) || shortDescriptionEn;
  const colors = formData
    .getAll("colors")
    .flatMap((value) => (typeof value === "string" ? value.split(/[\s,;]+/) : []))
    .filter((value) => /^#[0-9a-f]{6}$/i.test(value))
    .slice(0, 12);
  const { context } = await requireEcommerceStoreContext(storeId);
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:update-product:${productId}`),
    async (transaction) => {
      const product = await transaction.ecommerceProduct.findFirst({
        where: {
          id: productId,
          organizationId: context.organization.id,
          storeId,
          archivedAt: null,
        },
        select: { id: true },
      });
      if (!product) throw new Error("ECOMMERCE_PRODUCT_NOT_FOUND");
      await transaction.ecommerceProduct.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: productId } },
        data: { attributesJson: colors.length ? { colors } : {} },
      });
      for (const translation of [
        {
          locale: "en",
          name: nameEn,
          shortDescription: shortDescriptionEn,
          description: descriptionEn,
        },
        {
          locale: "ar",
          name: nameAr,
          shortDescription: shortDescriptionAr,
          description: descriptionAr,
        },
      ]) {
        await transaction.ecommerceProductTranslation.upsert({
          where: { productId_locale: { productId, locale: translation.locale } },
          update: translation,
          create: { productId, ...translation },
        });
      }
    },
  );
  refreshStore(storeId);
}

export async function deleteEcommerceProductAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const productId = requiredId(formData, "productId");
  const { context } = await requireEcommerceStoreContext(storeId);
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:delete-product:${productId}`),
    (transaction) =>
      transaction.ecommerceProduct.updateMany({
        where: {
          id: productId,
          organizationId: context.organization.id,
          storeId,
          archivedAt: null,
        },
        data: { archivedAt: new Date() },
      }),
  );
  refreshStore(storeId);
}

export async function adjustEcommerceInventoryAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const variantId = requiredId(formData, "variantId");
  const quantityDelta = integerField(formData, "quantityDelta");
  const reason = text(formData, "reason", 80) || "manual";
  if (quantityDelta === 0) return;
  const { context } = await requireEcommerceStoreContext(storeId);
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:inventory:${variantId}`),
    async (transaction) => {
      const variant = await transaction.ecommerceProductVariant.findFirst({
        where: { id: variantId, organizationId: context.organization.id, product: { storeId } },
        select: { stockQuantity: true },
      });
      if (!variant) throw new Error("ECOMMERCE_VARIANT_NOT_FOUND");
      if (variant.stockQuantity + quantityDelta < 0) throw new Error("INSUFFICIENT_INVENTORY");
      await transaction.ecommerceProductVariant.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: variantId } },
        data: { stockQuantity: { increment: quantityDelta } },
      });
      await transaction.ecommerceInventoryAdjustment.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          storeId,
          variantId,
          actorUserId: context.actor.id,
          quantityDelta,
          reason,
        },
      });
    },
  );
  refreshStore(storeId);
}

export async function updateEcommerceOrderStatusAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const orderId = requiredId(formData, "orderId");
  const nextStatus = text(formData, "status", 32) as OrderStatus;
  const { context } = await requireEcommerceStoreContext(storeId);
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:order-status:${orderId}`),
    async (transaction) => {
      const order = await transaction.ecommerceOrder.findFirst({
        where: { id: orderId, organizationId: context.organization.id, storeId },
        select: { status: true },
      });
      if (!order) throw new Error("ECOMMERCE_ORDER_NOT_FOUND");
      assertOrderTransition(order.status, nextStatus);
      await transaction.ecommerceOrder.update({
        where: { organizationId_id: { organizationId: context.organization.id, id: orderId } },
        data: { status: nextStatus, revision: { increment: 1 } },
      });
    },
  );
  refreshStore(storeId);
}

export async function createEcommerceCouponAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const { context } = await requireEcommerceStoreContext(storeId);
  const code = normalizeCouponCode(text(formData, "code", 80));
  const type = text(formData, "type", 20) === "percentage" ? "percentage" : "fixed";
  const value =
    type === "percentage"
      ? Math.round(Number(text(formData, "value", 20)) * 100)
      : amountField(formData, "value");
  if (!Number.isSafeInteger(value) || value <= 0 || (type === "percentage" && value > 10_000))
    return;
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:create-coupon:${code}`),
    (transaction) =>
      transaction.ecommerceCoupon.create({
        data: {
          id: randomUUID(),
          organizationId: context.organization.id,
          storeId,
          code,
          type,
          value,
          minimumOrderMinor: optionalAmountField(formData, "minimumOrder"),
          usageLimit: optionalIntegerField(formData, "usageLimit"),
        },
      }),
  );
  refreshStore(storeId);
}

export async function toggleEcommerceMethodAction(formData: FormData): Promise<void> {
  const storeId = requiredId(formData, "storeId");
  const methodId = requiredId(formData, "methodId");
  const kind = text(formData, "kind", 20);
  const { context } = await requireEcommerceStoreContext(storeId);
  await withTenantTransaction(
    dashboardDatabase(),
    tenant(context, `ecommerce:toggle-method:${methodId}`),
    async (transaction) => {
      if (kind === "payment") {
        const method = await transaction.ecommercePaymentMethod.findFirst({
          where: { id: methodId, organizationId: context.organization.id, storeId },
        });
        if (!method) throw new Error("ECOMMERCE_PAYMENT_METHOD_NOT_FOUND");
        await transaction.ecommercePaymentMethod.update({
          where: { id: methodId },
          data: { enabled: !method.enabled },
        });
      } else {
        const method = await transaction.ecommerceShippingMethod.findFirst({
          where: { id: methodId, organizationId: context.organization.id, storeId },
        });
        if (!method) throw new Error("ECOMMERCE_SHIPPING_METHOD_NOT_FOUND");
        await transaction.ecommerceShippingMethod.update({
          where: { id: methodId },
          data: { enabled: !method.enabled },
        });
      }
    },
  );
  refreshStore(storeId);
}

export async function commerceTemplateOptions() {
  const templates = await loadEcommerceTemplates();
  return templates.flatMap((template) =>
    template.versions
      .filter((version) => version.status === "ready")
      .map((version) => ({ id: version.id, label: `${template.name} ${version.version}` })),
  );
}

function requiredId(formData: FormData, key: string): string {
  const value = text(formData, key, 80);
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`INVALID_${key.toUpperCase()}`);
  return value;
}

function text(formData: FormData, key: string, maximum: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function colorField(formData: FormData, key: string, fallback: string): string {
  const value = text(formData, key, 7);
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function integerField(formData: FormData, key: string, fallback = 0): number {
  const value = Number.parseInt(text(formData, key, 20), 10);
  return Number.isSafeInteger(value) ? value : fallback;
}

function optionalIntegerField(formData: FormData, key: string): number | null {
  const raw = text(formData, key, 20);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function amountField(formData: FormData, key: string): number {
  const value = Number(text(formData, key, 30));
  if (!Number.isFinite(value)) throw new Error(`INVALID_${key.toUpperCase()}`);
  return assertMinorAmount(Math.round(value * 100), key);
}

function optionalAmountField(formData: FormData, key: string): number | null {
  return text(formData, key, 30) ? amountField(formData, key) : null;
}

function normalizeHostname(value: string): string | null {
  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0] ?? "";
  if (
    normalized.length > 253 ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,62}$/.test(
      normalized,
    )
  )
    return null;
  return normalized;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function tenant(
  context: Awaited<ReturnType<typeof requireEcommerceStoreContext>>["context"],
  correlationId: string,
) {
  return { organizationId: context.organization.id, actorId: context.actor.id, correlationId };
}

function refreshStore(storeId: string) {
  revalidatePath("/ecommerce");
  revalidatePath(`/ecommerce/stores/${storeId}`);
}
