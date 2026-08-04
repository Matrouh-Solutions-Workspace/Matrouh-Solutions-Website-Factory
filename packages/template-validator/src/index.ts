import { gte, lte, valid } from "semver";
import { buildPortableManifest, type TemplateDefinition } from "@factory/template-sdk";
export interface CompatibilityEnvironment {
  factoryVersion: string;
  rendererVersion: string;
  supportedSdkVersions: readonly string[];
  contentSchemaVersions: readonly number[];
  themeSchemaVersions: readonly number[];
  publicationSnapshotVersions: readonly number[];
}
export interface ValidationCheck {
  code: string;
  valid: boolean;
  message: string;
}
export interface ValidationReport {
  valid: boolean;
  checks: ValidationCheck[];
  manifest: ReturnType<typeof buildPortableManifest> | null;
}
export function validateTemplate(
  template: TemplateDefinition,
  environment: CompatibilityEnvironment,
): ValidationReport {
  const c = template.compatibility,
    checks: ValidationCheck[] = [];
  const add = (code: string, pass: boolean, message: string) =>
    checks.push({ code, valid: pass, message });
  add("COMPAT_SDK", environment.supportedSdkVersions.includes(c.sdkVersion), `SDK ${c.sdkVersion}`);
  add(
    "COMPAT_FACTORY_MIN",
    Boolean(
      valid(c.minimumFactoryVersion) && gte(environment.factoryVersion, c.minimumFactoryVersion),
    ),
    `Factory >= ${c.minimumFactoryVersion}`,
  );
  add(
    "COMPAT_FACTORY_MAX",
    c.maximumFactoryVersion === undefined ||
      lte(environment.factoryVersion, c.maximumFactoryVersion),
    "Factory maximum",
  );
  add(
    "COMPAT_RENDERER",
    gte(environment.rendererVersion, c.minimumRendererVersion),
    `Renderer >= ${c.minimumRendererVersion}`,
  );
  add(
    "COMPAT_CONTENT_SCHEMA",
    environment.contentSchemaVersions.includes(c.contentSchemaVersion),
    "Content schema",
  );
  add(
    "COMPAT_THEME_SCHEMA",
    environment.themeSchemaVersions.includes(c.themeSchemaVersion),
    "Theme schema",
  );
  add(
    "COMPAT_SNAPSHOT",
    environment.publicationSnapshotVersions.includes(c.publicationSnapshotVersion),
    "Snapshot schema",
  );
  let manifest: ReturnType<typeof buildPortableManifest> | null = null;
  try {
    manifest = buildPortableManifest(template);
    add("MANIFEST_BUILD", true, "Portable manifest built");
  } catch (error) {
    add("MANIFEST_BUILD", false, error instanceof Error ? error.message : "Manifest failed");
  }
  return { valid: checks.every((item) => item.valid), checks, manifest };
}
