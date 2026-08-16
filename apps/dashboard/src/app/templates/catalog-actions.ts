"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { withTenantTransaction } from "@factory/database";
import { requireDashboardContext } from "@/server/auth";
import { dashboardDatabase } from "@/server/database";
import type { TemplateCatalogSettingsState } from "./catalog-action-state";

export async function updateTemplateCatalogSettingsAction(
  _previous: TemplateCatalogSettingsState,
  formData: FormData,
): Promise<TemplateCatalogSettingsState> {
  const context = await requireDashboardContext("template.import");
  const templateId = text(formData, "templateId", 160);
  const sortOrder = Number.parseInt(text(formData, "sortOrder", 12), 10);
  const badge = optionalText(formData, "badge", 80);
  const badgeAr = optionalText(formData, "badgeAr", 80);
  const ctaLabel = optionalText(formData, "ctaLabel", 80);
  const ctaLabelAr = optionalText(formData, "ctaLabelAr", 80);
  const ctaHref = optionalText(formData, "ctaHref", 500);
  const salesDescription = optionalText(formData, "salesDescription", 600);
  const salesDescriptionAr = optionalText(formData, "salesDescriptionAr", 600);
  const highlights = optionalText(formData, "highlights", 1_200)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const highlightsAr = optionalText(formData, "highlightsAr", 1_200)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!/^[a-z0-9][a-z0-9.-]{2,159}$/.test(templateId)) return failure("Invalid template ID.");
  if (!Number.isInteger(sortOrder) || sortOrder < -10_000 || sortOrder > 10_000) {
    return failure("Sort order must be between -10,000 and 10,000.");
  }
  if (
    highlights.length > 8 ||
    highlightsAr.length > 8 ||
    [...highlights, ...highlightsAr].some((item) => item.length > 120)
  ) {
    return failure("Add up to 8 highlights, with one short benefit per line.");
  }
  if (ctaHref && !isSafeCatalogHref(ctaHref)) {
    return failure("CTA link must be a relative path, HTTPS URL, or mailto link.");
  }

  const correlationId = `template-catalog-settings:${templateId}:${randomUUID()}`;
  try {
    await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId,
      },
      async (transaction) => {
        const catalog = await transaction.templateCatalogEntry.update({
          where: { templateId },
          data: {
            catalogVisible: formData.get("visible") === "yes",
            catalogFeatured: formData.get("featured") === "yes",
            catalogSortOrder: sortOrder,
            catalogBadge: badge || null,
            catalogBadgeAr: badgeAr || null,
            catalogCtaLabel: ctaLabel || null,
            catalogCtaLabelAr: ctaLabelAr || null,
            catalogCtaHref: ctaHref || null,
            catalogSalesDescription: salesDescription || null,
            catalogSalesDescriptionAr: salesDescriptionAr || null,
            catalogHighlightsJson: highlights,
            catalogHighlightsArJson: highlightsAr,
          },
          select: { id: true },
        });
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            actorType: "user",
            actorId: context.actor.id,
            action: "template.catalog_settings_updated",
            resourceType: "template",
            resourceId: catalog.id,
            correlationId,
            metadataJson: {
              templateId,
              visible: formData.get("visible") === "yes",
            },
            retentionClass: "operational",
          },
        });
      },
    );
  } catch (error) {
    if (isRecordNotFound(error)) return failure("Template catalog entry was not found.");
    throw error;
  }

  revalidatePath("/templates");
  revalidatePath("/templates/public-listing");
  return { status: "success", message: "Public catalog settings saved." };
}

export async function updateTemplateCategoryAction(
  _previous: TemplateCatalogSettingsState,
  formData: FormData,
): Promise<TemplateCatalogSettingsState> {
  const context = await requireDashboardContext("template.import");
  const templateId = text(formData, "templateId", 160);
  const category = text(formData, "category", 80);
  const categoryAr = optionalText(formData, "categoryAr", 80);

  if (!/^[a-z0-9][a-z0-9.-]{2,159}$/.test(templateId)) return failure("Invalid template ID.");
  if (!category) return failure("Add an English category for this template.");

  const correlationId = `template-category:${templateId}:${randomUUID()}`;
  try {
    await withTenantTransaction(
      dashboardDatabase(),
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId,
      },
      async (transaction) => {
        const catalog = await transaction.templateCatalogEntry.update({
          where: { templateId },
          data: {
            catalogCategory: category,
            catalogCategoryAr: categoryAr || null,
          },
          select: { id: true },
        });
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            actorType: "user",
            actorId: context.actor.id,
            action: "template.category_updated",
            resourceType: "template",
            resourceId: catalog.id,
            correlationId,
            metadataJson: { templateId, category, categoryAr },
            retentionClass: "operational",
          },
        });
      },
    );
  } catch (error) {
    if (isRecordNotFound(error)) return failure("Template catalog entry was not found.");
    throw error;
  }

  revalidatePath("/templates");
  revalidatePath("/templates/public-listing");
  return { status: "success", message: "Template category saved." };
}

function text(formData: FormData, key: string, maximumLength: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function optionalText(formData: FormData, key: string, maximumLength: number): string {
  return text(formData, key, maximumLength);
}

function isSafeCatalogHref(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

function isRecordNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2025");
}

function failure(message: string): TemplateCatalogSettingsState {
  return { status: "error", message };
}
