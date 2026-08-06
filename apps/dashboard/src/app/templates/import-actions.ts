"use server";

import { randomUUID } from "node:crypto";
import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { revalidatePath } from "next/cache";
import { projectComponents } from "@factory/component-registry";
import { withTenantTransaction } from "@factory/database";
import { compilePublication, createDefaultTemplateDraft } from "@factory/publication-compiler";
import type { JsonValue } from "@factory/template-sdk";
import {
  discoverTemplates,
  loadTemplateArtifact,
  TemplateLoadError,
} from "@factory/template-loader";
import { validateTemplate } from "@factory/template-validator";
import { requireDashboardContext } from "@/server/auth";
import { dashboardConfig, workspaceRoot } from "@/server/config";
import { dashboardDatabase } from "@/server/database";

const templatesRoot = resolve(workspaceRoot, dashboardConfig.FACTORY_TEMPLATE_DIRECTORY);

export interface TemplateImportState {
  readonly status: "idle" | "success" | "error";
  readonly message: string;
}

export const initialTemplateImportState: TemplateImportState = { status: "idle", message: "" };

export async function importTemplateAction(
  _previous: TemplateImportState,
  formData: FormData,
): Promise<TemplateImportState> {
  const context = await requireDashboardContext("template.import");
  if (dashboardConfig.FACTORY_DEPLOYMENT_MODE !== "local") {
    return failure(
      "Dashboard artifact imports are disabled in production. Install signed artifacts through deployment tooling.",
    );
  }
  if (formData.get("trusted") !== "yes") {
    return failure("Confirm that this compiled artifact comes from a trusted author.");
  }
  const discoveryFile = uploadedFile(formData.get("discovery"));
  const manifestFile = uploadedFile(formData.get("manifest"));
  const entryFile = uploadedFile(formData.get("entry"));
  if (!discoveryFile || !manifestFile || !entryFile) {
    return failure("Select the discovery manifest, generated manifest, and compiled entry files.");
  }
  if (discoveryFile.size > 64_000 || manifestFile.size > 1_000_000 || entryFile.size > 4_000_000) {
    return failure("The artifact exceeds the supported import size.");
  }

  let discovery: Record<string, unknown>;
  try {
    discovery = JSON.parse(await discoveryFile.text()) as Record<string, unknown>;
  } catch {
    return failure("The discovery manifest is not valid JSON.");
  }
  const templateId = typeof discovery.templateId === "string" ? discovery.templateId : "";
  const templateVersion =
    typeof discovery.templateVersion === "string" ? discovery.templateVersion : "";
  if (
    !/^[a-z0-9][a-z0-9.-]{2,159}$/.test(templateId) ||
    !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(templateVersion) ||
    discovery.packageEntry !== "./dist/index.js" ||
    discovery.generatedManifest !== "./generated/matrouh.template.manifest.json"
  ) {
    return failure("The discovery manifest identity or artifact paths are invalid.");
  }
  const database = dashboardDatabase();
  const existing = await database.templateVersionRecord.findUnique({
    where: { templateId_templateVersion: { templateId, templateVersion } },
    select: { id: true },
  });
  if (existing)
    return failure("That exact template version is already installed and is immutable.");

  const folderName = `imported-${templateId.replace(/[^a-z0-9]+/g, "-")}-${templateVersion}`;
  const destination = join(templatesRoot, folderName);
  try {
    await access(destination);
    return failure("An artifact folder already exists for this template version.");
  } catch {
    // The destination must not exist before the atomic install.
  }

  const staging = join(templatesRoot, `.template-import-${randomUUID()}`);
  let installed = false;
  try {
    await mkdir(join(staging, "dist"), { recursive: true });
    await mkdir(join(staging, "generated"), { recursive: true });
    await Promise.all([
      writeFile(join(staging, "matrouh.template.json"), await discoveryFile.bytes()),
      writeFile(
        join(staging, "generated", "matrouh.template.manifest.json"),
        await manifestFile.bytes(),
      ),
      writeFile(join(staging, "dist", "index.js"), await entryFile.bytes()),
      writeFile(
        join(staging, "package.json"),
        JSON.stringify(
          {
            name: `@imported/${folderName}`,
            version: templateVersion,
            private: true,
            type: "module",
          },
          null,
          2,
        ),
      ),
    ]);
    const candidate = (await discoverTemplates(templatesRoot)).find(
      (item) => item.root === staging || item.root.endsWith(`\\${staging.split("\\").at(-1)}`),
    );
    if (!candidate) throw new Error("IMPORT_DISCOVERY_FAILED");
    const artifact = await loadTemplateArtifact(candidate);
    const report = validateTemplate(artifact, {
      factoryVersion: "0.1.0",
      rendererVersion: "0.1.0",
      supportedSdkVersions: ["1.0.0"],
      contentSchemaVersions: [1],
      themeSchemaVersions: [1],
      publicationSnapshotVersions: [1],
    });
    if (!report.valid || !report.manifest) {
      const failed = report.checks.filter((check) => !check.valid).map((check) => check.code);
      return failure(
        `Template validation failed: ${failed.join(", ") || "unknown contract error"}.`,
      );
    }
    const manifest = report.manifest;
    const defaults = compilePublication(
      createDefaultTemplateDraft(artifact.definition, artifact.artifactHash),
      artifact.definition,
      artifact.artifactHash,
      manifest.manifestHash,
    );
    if (!defaults.success) {
      return failure(
        `Template defaults cannot create a website: ${defaults.diagnostics.map((item) => item.code).join(", ")}.`,
      );
    }
    await rename(staging, destination);
    installed = true;
    const template = artifact.definition;
    await withTenantTransaction(
      database,
      {
        organizationId: context.organization.id,
        actorId: context.actor.id,
        correlationId: `template-import:${templateId}@${templateVersion}`,
      },
      async (transaction) => {
        const catalog = await transaction.templateCatalogEntry.upsert({
          where: { templateId },
          update: {
            displayName: template.manifest.displayName,
            author: template.manifest.author,
            description: template.manifest.description,
            category: template.manifest.category,
            lifecycleStatus: "ready",
          },
          create: {
            id: randomUUID(),
            templateId,
            displayName: template.manifest.displayName,
            author: template.manifest.author,
            description: template.manifest.description,
            category: template.manifest.category,
            lifecycleStatus: "ready",
          },
        });
        const version = await transaction.templateVersionRecord.create({
          data: {
            id: randomUUID(),
            templateCatalogEntryId: catalog.id,
            templateId,
            templateVersion,
            artifactUri: relative(templatesRoot, destination).replaceAll("\\", "/"),
            artifactHash: artifact.artifactHash,
            sdkVersion: template.compatibility.sdkVersion,
            minimumFactoryVersion: template.compatibility.minimumFactoryVersion,
            maximumFactoryVersion: template.compatibility.maximumFactoryVersion ?? null,
            minimumRendererVersion: template.compatibility.minimumRendererVersion,
            contentSchemaVersion: template.compatibility.contentSchemaVersion,
            themeSchemaVersion: template.compatibility.themeSchemaVersion,
            publicationSnapshotVersion: template.compatibility.publicationSnapshotVersion,
            manifestJson: jsonInput(manifest),
            validationReportJson: jsonInput(report),
            validationStatus: "valid",
            lifecycleStatus: "ready",
            validatedAt: new Date(),
          },
        });
        const components = projectComponents(manifest, version.id);
        if (components.length) {
          await transaction.componentCatalogEntry.createMany({
            data: components.map((component) => ({
              id: randomUUID(),
              artifactKind: "template",
              artifactId: version.id,
              ownerId: component.ownerId,
              ownerVersion: component.ownerVersion,
              componentKind: component.kind,
              componentId: component.componentId,
              displayName: component.title,
              description: component.description ?? null,
              category: component.category ?? null,
              searchText: component.searchText,
              metadataJson: jsonInput({ capabilities: component.capabilities }),
              schemaVersion:
                component.kind === "theme"
                  ? template.theme.schemaVersion
                  : ([...template.widgets, ...template.blocks, ...template.sections].find(
                      (definition) => definition.id === component.componentId,
                    )?.schema.version ?? 1),
            })),
          });
        }
        await transaction.auditEvent.create({
          data: {
            id: randomUUID(),
            organizationId: context.organization.id,
            actorType: "user",
            actorId: context.actor.id,
            action: "template.imported",
            resourceType: "template",
            resourceId: templateId,
            correlationId: `template-import:${templateId}@${templateVersion}`,
            metadataJson: jsonInput({
              templateId,
              templateVersion,
              artifactHash: artifact.artifactHash,
            }),
            retentionClass: "security",
          },
        });
      },
    );
    revalidatePath("/templates");
    return {
      status: "success",
      message: `${template.manifest.displayName} ${templateVersion} was validated and installed.`,
    };
  } catch (error) {
    if (installed) await rm(destination, { recursive: true, force: true });
    return failure(importErrorMessage(error));
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function uploadedFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

function failure(message: string): TemplateImportState {
  return { status: "error", message };
}

function importErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "The template could not be imported.";
  if (error instanceof TemplateLoadError && error.code === "LOADER_EXECUTABLE_IMPORT_FAILED") {
    return "The compiled entry could not load. Ensure it is an ESM bundle with only supported dependencies.";
  }
  if (error instanceof TemplateLoadError) return `Artifact validation failed (${error.code}).`;
  return `The template could not be imported: ${error.message}`;
}

function jsonInput(value: unknown): Exclude<JsonValue, null> {
  return (value ?? {}) as Exclude<JsonValue, null>;
}
