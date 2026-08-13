import { resolve } from "node:path";
import {
  loadCatalogedTemplateArtifact,
  TemplateLoadError,
  type LoadedTemplateArtifact,
} from "@factory/template-loader";
import { requireDashboardContext } from "./auth";
import { dashboardConfig, workspaceRoot } from "./config";
import { dashboardDatabase } from "./database";

const templatesRoot = resolve(workspaceRoot, dashboardConfig.FACTORY_TEMPLATE_DIRECTORY);

export interface TemplateCatalogItem {
  readonly templateId: string;
  readonly displayName: string;
  readonly author: string;
  readonly description: string;
  readonly category: string;
  readonly lifecycleStatus: string;
  readonly catalog: {
    readonly visible: boolean;
    readonly priceMinor: number;
    readonly currency: string;
    readonly billingPeriod: string;
    readonly featured: boolean;
    readonly sortOrder: number;
    readonly category: string;
    readonly categoryAr: string;
    readonly badge: string;
    readonly badgeAr: string;
    readonly ctaLabel: string;
    readonly ctaLabelAr: string;
    readonly ctaHref: string;
    readonly salesDescription: string;
    readonly salesDescriptionAr: string;
    readonly highlights: readonly string[];
    readonly highlightsAr: readonly string[];
  };
  readonly versions: readonly {
    readonly version: string;
    readonly lifecycleStatus: string;
    readonly validationStatus: string;
  }[];
}

export async function loadTemplateCatalog(): Promise<readonly TemplateCatalogItem[]> {
  await requireDashboardContext("website.read");
  const rows = await dashboardDatabase().templateCatalogEntry.findMany({
    orderBy: { displayName: "asc" },
    include: {
      versions: {
        where: {
          lifecycleStatus: { in: ["ready", "deprecated"] },
          validationStatus: "valid",
        },
        orderBy: { discoveredAt: "desc" },
        select: {
          templateVersion: true,
          lifecycleStatus: true,
          validationStatus: true,
        },
      },
    },
  });
  return rows
    .map((row) => ({
      templateId: row.templateId,
      displayName: row.displayName,
      author: row.author,
      description: row.description,
      category: row.category,
      lifecycleStatus: row.lifecycleStatus,
      catalog: {
        visible: row.catalogVisible ?? true,
        priceMinor: row.catalogPriceMinor ?? 25000,
        currency: row.catalogCurrency || "EGP",
        billingPeriod: row.catalogBillingPeriod || "month",
        featured: row.catalogFeatured ?? false,
        sortOrder: row.catalogSortOrder ?? 0,
        category: row.catalogCategory || row.category,
        categoryAr: row.catalogCategoryAr ?? "",
        badge: row.catalogBadge ?? "",
        badgeAr: row.catalogBadgeAr ?? "",
        ctaLabel: row.catalogCtaLabel ?? "",
        ctaLabelAr: row.catalogCtaLabelAr ?? "",
        ctaHref: row.catalogCtaHref ?? "",
        salesDescription: row.catalogSalesDescription ?? "",
        salesDescriptionAr: row.catalogSalesDescriptionAr ?? "",
        highlights: stringArray(row.catalogHighlightsJson),
        highlightsAr: stringArray(row.catalogHighlightsArJson),
      },
      versions: row.versions
        .map((version) => ({
          version: version.templateVersion,
          lifecycleStatus: version.lifecycleStatus,
          validationStatus: version.validationStatus,
        }))
        .sort((left, right) =>
          right.version.localeCompare(left.version, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        ),
    }))
    .filter((row) => row.versions.length > 0);
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function loadExactCatalogTemplate(
  templateId: string,
  templateVersion: string,
): Promise<LoadedTemplateArtifact | null> {
  await requireDashboardContext("website.read");
  const record = await dashboardDatabase().templateVersionRecord.findUnique({
    where: { templateId_templateVersion: { templateId, templateVersion } },
    select: {
      artifactUri: true,
      artifactHash: true,
      lifecycleStatus: true,
      validationStatus: true,
    },
  });
  if (
    !record ||
    record.validationStatus !== "valid" ||
    !["ready", "deprecated"].includes(record.lifecycleStatus)
  ) {
    return null;
  }
  try {
    const artifact = await loadCatalogedTemplateArtifact(templatesRoot, record.artifactUri, {
      templateId,
      templateVersion,
    });
    return artifact.artifactHash === record.artifactHash ? artifact : null;
  } catch (error) {
    // The catalog is synchronized separately from the template workspace. A deployment or a
    // local checkout can therefore briefly retain a valid catalog row whose compiled artifact
    // has not been deployed or built yet. Treat that stale row as unavailable instead of
    // turning a request for this route into a 500. The sync worker will quarantine or remove it.
    if (error instanceof TemplateLoadError && error.code === "LOADER_ARTIFACT_MISSING") {
      return null;
    }
    throw error;
  }
}
