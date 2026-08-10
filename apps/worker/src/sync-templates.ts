import { randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";
import { projectComponents } from "@factory/component-registry";
import { createDatabaseClient } from "@factory/database";
import type { JsonValue } from "@factory/template-sdk";
import { discoverTemplates, loadTemplateArtifact } from "@factory/template-loader";
import { validateTemplate } from "@factory/template-validator";
import { workerConfig, workspaceRoot } from "./config";
import { artifactIntegrityMatches, missingArtifactDisposition } from "./template-sync-policy";

const database = createDatabaseClient({ connectionString: workerConfig.DATABASE_URL });
const templatesRoot = resolve(workspaceRoot, workerConfig.FACTORY_TEMPLATE_DIRECTORY);
const requestedTemplateId = process.env.FACTORY_TEMPLATE_SYNC_ID?.trim();
const requestedTemplateVersion = process.env.FACTORY_TEMPLATE_SYNC_VERSION?.trim();
let ready = 0;
let quarantined = 0;
let integrityFailed = 0;
let missingPruned = 0;
let missingReferenced = 0;

try {
  const discovered = await discoverTemplates(templatesRoot);
  const candidates = discovered.filter(
    (candidate) =>
      (!requestedTemplateId || candidate.discovery.templateId === requestedTemplateId) &&
      (!requestedTemplateVersion ||
        candidate.discovery.templateVersion === requestedTemplateVersion),
  );
  if (requestedTemplateId && candidates.length === 0) {
    throw new Error(
      `TEMPLATE_NOT_DISCOVERED:${requestedTemplateId}${requestedTemplateVersion ? `@${requestedTemplateVersion}` : ""}`,
    );
  }
  const discoveredKeys = new Set(
    discovered.map(
      (candidate) => `${candidate.discovery.templateId}@${candidate.discovery.templateVersion}`,
    ),
  );
  const catalogRecords = await database.templateVersionRecord.findMany({
    where: {
      ...(requestedTemplateId ? { templateId: requestedTemplateId } : {}),
      ...(requestedTemplateVersion ? { templateVersion: requestedTemplateVersion } : {}),
    },
    select: { id: true, templateId: true, templateVersion: true },
  });
  for (const record of catalogRecords) {
    const key = `${record.templateId}@${record.templateVersion}`;
    if (discoveredKeys.has(key)) continue;
    const websiteReferences = await database.website.count({
      where: { templateId: record.templateId, templateVersion: record.templateVersion },
    });
    if (missingArtifactDisposition(websiteReferences) === "quarantine") {
      await database.templateVersionRecord.update({
        where: { id: record.id },
        data: { lifecycleStatus: "quarantined", validationStatus: "artifact_missing" },
      });
      missingReferenced += 1;
      quarantined += 1;
      continue;
    }
    await database.$transaction([
      database.componentCatalogEntry.deleteMany({
        where: { artifactKind: "template", artifactId: record.id },
      }),
      database.templateVersionRecord.delete({ where: { id: record.id } }),
    ]);
    missingPruned += 1;
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
    if (existing && !artifactIntegrityMatches(existing.artifactHash, artifact.artifactHash)) {
      await database.templateVersionRecord.update({
        where: { id: existing.id },
        data: { lifecycleStatus: "quarantined", validationStatus: "integrity_failed" },
      });
      integrityFailed += 1;
      quarantined += 1;
      continue;
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
  const emptyCatalogs = await database.templateCatalogEntry.findMany({
    where: { versions: { none: {} } },
    select: { id: true },
  });
  if (emptyCatalogs.length > 0) {
    await database.templateCatalogEntry.deleteMany({
      where: { id: { in: emptyCatalogs.map((catalog) => catalog.id) } },
    });
  }
  const remainingCatalogs = await database.templateCatalogEntry.findMany({
    select: {
      id: true,
      versions: {
        where: { lifecycleStatus: "ready", validationStatus: "valid" },
        select: { id: true },
        take: 1,
      },
    },
  });
  for (const catalog of remainingCatalogs) {
    await database.templateCatalogEntry.update({
      where: { id: catalog.id },
      data: { lifecycleStatus: catalog.versions.length > 0 ? "ready" : "quarantined" },
    });
  }
  console.log(
    JSON.stringify({
      service: "template-sync",
      ready,
      quarantined,
      integrityFailed,
      missingPruned,
      missingReferenced,
      emptyCatalogsPruned: emptyCatalogs.length,
    }),
  );
} finally {
  await database.$disconnect();
}

function jsonInput(value: unknown): Exclude<JsonValue, null> {
  return (value ?? {}) as Exclude<JsonValue, null>;
}
