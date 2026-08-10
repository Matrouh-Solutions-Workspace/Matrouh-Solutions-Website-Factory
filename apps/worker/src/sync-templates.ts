import { randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";
import { projectComponents } from "@factory/component-registry";
import { createDatabaseClient } from "@factory/database";
import type { JsonValue } from "@factory/template-sdk";
import { discoverTemplates, loadTemplateArtifact } from "@factory/template-loader";
import { validateTemplate } from "@factory/template-validator";
import { workerConfig, workspaceRoot } from "./config";

const database = createDatabaseClient({ connectionString: workerConfig.DATABASE_URL });
const templatesRoot = resolve(workspaceRoot, workerConfig.FACTORY_TEMPLATE_DIRECTORY);
const requestedTemplateId = process.env.FACTORY_TEMPLATE_SYNC_ID?.trim();
let ready = 0;
let quarantined = 0;

try {
  const discovered = await discoverTemplates(templatesRoot);
  const candidates = requestedTemplateId
    ? discovered.filter((candidate) => candidate.discovery.templateId === requestedTemplateId)
    : discovered;
  if (requestedTemplateId && candidates.length === 0) {
    throw new Error(`TEMPLATE_NOT_DISCOVERED:${requestedTemplateId}`);
  }
  for (const candidate of candidates) {
    const artifact = await loadTemplateArtifact(candidate);
    const template = artifact.definition;
    const report = validateTemplate(artifact, {
      factoryVersion: "0.1.0",
      rendererVersion: "0.1.0",
      supportedSdkVersions: ["1.0.0"],
      contentSchemaVersions: [1],
      themeSchemaVersions: [1],
      publicationSnapshotVersions: [1],
    });
    const lifecycle = report.valid && report.manifest ? "ready" : "quarantined";
    const existing = await database.templateVersionRecord.findUnique({
      where: {
        templateId_templateVersion: {
          templateId: candidate.discovery.templateId,
          templateVersion: candidate.discovery.templateVersion,
        },
      },
    });
    if (existing && existing.artifactHash !== artifact.artifactHash) {
      await database.templateVersionRecord.update({
        where: { id: existing.id },
        data: { lifecycleStatus: "quarantined", validationStatus: "integrity_failed" },
      });
      throw new Error(
        `TEMPLATE_VERSION_IMMUTABLE:${candidate.discovery.templateId}@${candidate.discovery.templateVersion}`,
      );
    }
    const catalog = await database.templateCatalogEntry.upsert({
      where: { templateId: candidate.discovery.templateId },
      update: {
        displayName: template.manifest.displayName,
        author: template.manifest.author,
        description: template.manifest.description,
        category: template.manifest.category,
        lifecycleStatus: lifecycle,
      },
      create: {
        id: randomUUID(),
        templateId: candidate.discovery.templateId,
        displayName: template.manifest.displayName,
        author: template.manifest.author,
        description: template.manifest.description,
        category: template.manifest.category,
        lifecycleStatus: lifecycle,
      },
    });
    const versionId = existing?.id ?? randomUUID();
    const version = await database.templateVersionRecord.upsert({
      where: {
        templateId_templateVersion: {
          templateId: candidate.discovery.templateId,
          templateVersion: candidate.discovery.templateVersion,
        },
      },
      update: {
        artifactUri: relative(templatesRoot, candidate.root).replaceAll("\\", "/"),
        validationReportJson: jsonInput(report),
        validationStatus: report.valid ? "valid" : "invalid",
        lifecycleStatus: lifecycle,
        validatedAt: new Date(),
      },
      create: {
        id: versionId,
        templateCatalogEntryId: catalog.id,
        templateId: candidate.discovery.templateId,
        templateVersion: candidate.discovery.templateVersion,
        artifactUri: relative(templatesRoot, candidate.root).replaceAll("\\", "/"),
        artifactHash: artifact.artifactHash,
        sdkVersion: template.compatibility.sdkVersion,
        minimumFactoryVersion: template.compatibility.minimumFactoryVersion,
        maximumFactoryVersion: template.compatibility.maximumFactoryVersion ?? null,
        minimumRendererVersion: template.compatibility.minimumRendererVersion,
        contentSchemaVersion: template.compatibility.contentSchemaVersion,
        themeSchemaVersion: template.compatibility.themeSchemaVersion,
        publicationSnapshotVersion: template.compatibility.publicationSnapshotVersion,
        manifestJson: jsonInput(report.manifest ?? {}),
        validationReportJson: jsonInput(report),
        validationStatus: report.valid ? "valid" : "invalid",
        lifecycleStatus: lifecycle,
        validatedAt: new Date(),
      },
    });
    await database.componentCatalogEntry.deleteMany({
      where: { artifactKind: "template", artifactId: version.id },
    });
    if (report.manifest) {
      const components = projectComponents(report.manifest, version.id);
      if (components.length > 0) {
        await database.componentCatalogEntry.createMany({
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
    }
    if (lifecycle === "ready") ready += 1;
    else quarantined += 1;
  }
  console.log(JSON.stringify({ service: "template-sync", ready, quarantined }));
} finally {
  await database.$disconnect();
}

function jsonInput(value: unknown): Exclude<JsonValue, null> {
  return (value ?? {}) as Exclude<JsonValue, null>;
}
