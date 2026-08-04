import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { discoverTemplates, loadTemplate } from "@factory/template-loader";
import { validateTemplate } from "@factory/template-validator";
import { compilePublication } from "@factory/publication-compiler";
const root = join(process.cwd(), "..", ".."),
  templatesRoot = join(root, "templates"),
  artifactsRoot = process.env.FACTORY_ARTIFACT_DIRECTORY ?? join(root, "artifacts");
await mkdir(artifactsRoot, { recursive: true });
const domains: Record<string, string> = {};
for (const candidate of await discoverTemplates(templatesRoot)) {
  const template = await loadTemplate(candidate);
  const report = validateTemplate(template, {
    factoryVersion: "0.1.0",
    rendererVersion: "0.1.0",
    supportedSdkVersions: ["1.0.0"],
    contentSchemaVersions: [1],
    themeSchemaVersions: [1],
    publicationSnapshotVersions: [1],
  });
  if (!report.valid) throw new Error(`Invalid template ${candidate.discovery.templateId}`);
  const publicationId = randomUUID(),
    page = template.pages[0];
  if (!page) continue;
  const sections = page.defaultSections.map((item, index) => {
    const definition = template.sections.find((section) => section.id === item.sectionTypeId);
    if (!definition) throw new Error("Default section missing");
    return {
      id: randomUUID(),
      sectionTypeId: definition.id,
      schemaVersion: definition.schema.version,
      content: item.content ?? definition.defaults,
      orderKey: String(index).padStart(4, "0"),
    };
  });
  const slug = page.slug.defaultValue ?? "/";
  const result = compilePublication(
    {
      organizationId: randomUUID(),
      websiteId: randomUUID(),
      publicationId,
      revision: 1n,
      name: template.manifest.displayName,
      defaultLocale: "en",
      settings: {},
      locales: [{ locale: "en", fallbackLocale: null }],
      pages: [
        {
          id: randomUUID(),
          pageTypeId: page.id,
          locale: "en",
          title: page.title,
          slug,
          seo: { title: template.manifest.displayName, description: template.manifest.description },
          sections,
        },
      ],
      navigation: [],
      theme: template.theme.defaults,
      media: [],
    },
    template,
    createHash("sha256")
      .update(candidate.discovery.templateId + candidate.discovery.templateVersion)
      .digest("hex"),
  );
  if (!result.success) throw new Error(JSON.stringify(result.diagnostics));
  await writeFile(
    join(artifactsRoot, `${publicationId}.json`),
    JSON.stringify(result.snapshot, null, 2),
  );
  const label = candidate.discovery.templateId.split(".").at(-1) ?? candidate.discovery.templateId;
  domains[`${label}.localhost`] = publicationId;
}
await writeFile(join(artifactsRoot, "domains.json"), JSON.stringify(domains, null, 2));
console.log(`Seeded ${Object.keys(domains).length} immutable publications in ${artifactsRoot}`);
