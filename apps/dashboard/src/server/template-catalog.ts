import { resolve } from "node:path";
import {
  loadCatalogedTemplateArtifact,
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
        orderBy: { discoveredAt: "desc" },
        select: {
          templateVersion: true,
          lifecycleStatus: true,
          validationStatus: true,
        },
      },
    },
  });
  return rows.map((row) => ({
    templateId: row.templateId,
    displayName: row.displayName,
    author: row.author,
    description: row.description,
    category: row.category,
    lifecycleStatus: row.lifecycleStatus,
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
  }));
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
  const artifact = await loadCatalogedTemplateArtifact(templatesRoot, record.artifactUri, {
    templateId,
    templateVersion,
  });
  return artifact.artifactHash === record.artifactHash ? artifact : null;
}
