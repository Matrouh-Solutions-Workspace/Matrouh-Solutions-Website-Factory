import { gte, lte, satisfies, valid } from "semver";
import {
  buildPortableManifest,
  type PortableTemplateManifest,
  type TemplateDefinition,
} from "@factory/template-sdk";

export interface CompatibilityEnvironment {
  readonly factoryVersion: string;
  readonly rendererVersion: string;
  readonly supportedSdkVersions: readonly string[];
  readonly contentSchemaVersions: readonly number[];
  readonly themeSchemaVersions: readonly number[];
  readonly publicationSnapshotVersions: readonly number[];
  readonly supportedCapabilities?: Readonly<Record<string, string>>;
  readonly allowedTemplateDependencies?: readonly string[];
}

export interface ValidationCheck {
  readonly code: string;
  readonly valid: boolean;
  readonly message: string;
  readonly path?: string;
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly checks: readonly ValidationCheck[];
  readonly manifest: PortableTemplateManifest | null;
  readonly artifactIdentity: string;
  readonly artifactHash: string | null;
  readonly manifestHash: string | null;
  readonly validatorVersion: "1.0.0";
}

interface ArtifactInput {
  readonly definition: TemplateDefinition;
  readonly manifest: PortableTemplateManifest;
  readonly artifactHash: string;
  readonly byteSize?: number;
}

export function validateTemplate(
  input: TemplateDefinition | ArtifactInput,
  environment: CompatibilityEnvironment,
): ValidationReport {
  let artifact: ArtifactInput | null = null;
  let template: TemplateDefinition;
  if (isArtifactInput(input)) {
    artifact = input;
    template = input.definition;
  } else {
    template = input;
  }
  const compatibility = template.compatibility;
  const checks: ValidationCheck[] = [];
  const add = (code: string, pass: boolean, message: string, path?: string) => {
    checks.push({ code, valid: pass, message, ...(path === undefined ? {} : { path }) });
  };

  const factoryVersionValid = Boolean(valid(environment.factoryVersion));
  const rendererVersionValid = Boolean(valid(environment.rendererVersion));
  add(
    "ENV_FACTORY_SEMVER",
    factoryVersionValid,
    "Factory version is valid semver",
    "/environment/factoryVersion",
  );
  add(
    "ENV_RENDERER_SEMVER",
    rendererVersionValid,
    "Renderer version is valid semver",
    "/environment/rendererVersion",
  );
  add(
    "COMPAT_SDK",
    environment.supportedSdkVersions.includes(compatibility.sdkVersion),
    `SDK ${compatibility.sdkVersion}`,
    "/compatibility/sdkVersion",
  );
  add(
    "COMPAT_FACTORY_MIN",
    factoryVersionValid &&
      Boolean(valid(compatibility.minimumFactoryVersion)) &&
      gte(environment.factoryVersion, compatibility.minimumFactoryVersion),
    `Factory >= ${compatibility.minimumFactoryVersion}`,
    "/compatibility/minimumFactoryVersion",
  );
  add(
    "COMPAT_FACTORY_MAX",
    compatibility.maximumFactoryVersion === undefined ||
      (factoryVersionValid &&
        Boolean(valid(compatibility.maximumFactoryVersion)) &&
        lte(environment.factoryVersion, compatibility.maximumFactoryVersion)),
    "Factory maximum version",
    "/compatibility/maximumFactoryVersion",
  );
  add(
    "COMPAT_RENDERER",
    rendererVersionValid &&
      Boolean(valid(compatibility.minimumRendererVersion)) &&
      gte(environment.rendererVersion, compatibility.minimumRendererVersion),
    `Renderer >= ${compatibility.minimumRendererVersion}`,
    "/compatibility/minimumRendererVersion",
  );
  add(
    "COMPAT_CONTENT_SCHEMA",
    environment.contentSchemaVersions.includes(compatibility.contentSchemaVersion),
    "Content schema version",
    "/compatibility/contentSchemaVersion",
  );
  add(
    "COMPAT_THEME_SCHEMA",
    environment.themeSchemaVersions.includes(compatibility.themeSchemaVersion),
    "Theme schema version",
    "/compatibility/themeSchemaVersion",
  );
  add(
    "COMPAT_SNAPSHOT",
    environment.publicationSnapshotVersions.includes(compatibility.publicationSnapshotVersion),
    "Publication snapshot version",
    "/compatibility/publicationSnapshotVersion",
  );

  let manifest: PortableTemplateManifest | null = null;
  try {
    manifest = buildPortableManifest(template);
    add("MANIFEST_BUILD", true, "Portable manifest built deterministically");
    add(
      "MANIFEST_IDENTITY",
      manifest.manifest.id === template.manifest.id &&
        manifest.manifest.version === template.manifest.version,
      "Manifest and executable identity agree",
    );
    add(
      "MANIFEST_STRUCTURAL_SCHEMAS",
      Boolean(
        manifest.websiteSchema.jsonSchema &&
        manifest.theme.schema.jsonSchema &&
        manifest.components.every((component) => component.schema.jsonSchema),
      ),
      "All portable schemas contain structural JSON Schema",
    );
    add(
      "MANIFEST_EXECUTABLE_CONSISTENCY",
      artifact === null || artifact.manifest.manifestHash === manifest.manifestHash,
      "Portable manifest matches executable definition",
    );
  } catch (error) {
    add(
      "MANIFEST_BUILD",
      false,
      error instanceof Error ? error.message : "Portable manifest build failed",
    );
  }

  const widgets = template.widgets ?? [];
  const blocks = template.blocks ?? [];
  const sections = template.sections ?? [];
  const requiredCapabilities = [
    ...(template.capabilities ?? []),
    ...widgets.flatMap((component) => component.capabilities ?? []),
    ...blocks.flatMap((component) => component.capabilities ?? []),
    ...sections.flatMap((component) => component.capabilities ?? []),
  ];
  const capabilityEnvironment = environment.supportedCapabilities ?? {};
  for (const capability of requiredCapabilities) {
    const availableVersion = capabilityEnvironment[capability.id];
    const compatible =
      availableVersion !== undefined &&
      Boolean(valid(availableVersion)) &&
      satisfies(availableVersion, capability.versionRange);
    add(
      `CAPABILITY_${capability.id}`,
      !capability.required || compatible,
      compatible
        ? `Capability ${capability.id} is supported`
        : `${capability.required ? "Required" : "Optional"} capability ${capability.id} is unavailable`,
      `/capabilities/${capability.id}`,
    );
  }

  add(
    "DEFAULTS_EXECUTABLE_VALID",
    [...widgets, ...blocks, ...sections].every(
      (component) => component.schema.safeParse(component.defaults).success,
    ) &&
      (template.theme?.schema.safeParse(template.theme.defaults).success ?? false),
    "Component and theme defaults validate",
  );
  add(
    "MIGRATION_GRAPH",
    hasUnambiguousMigrationGraph(template),
    "Migration edges are forward-only and unambiguous",
  );
  add(
    "ARTIFACT_HASH",
    artifact === null || /^[0-9a-f]{64}$/.test(artifact.artifactHash),
    "Artifact has a SHA-256 integrity identity",
  );
  add(
    "ARTIFACT_SIZE",
    artifact?.byteSize === undefined || artifact.byteSize <= 11_000_000,
    "Artifact is within the configured size limit",
  );

  const sortedChecks = checks.sort(
    (left, right) =>
      (left.path ?? "").localeCompare(right.path ?? "") || left.code.localeCompare(right.code),
  );
  return Object.freeze({
    valid: sortedChecks.every((check) => check.valid),
    checks: Object.freeze(sortedChecks),
    manifest,
    artifactIdentity: `${template.manifest?.id ?? "unknown"}@${template.manifest?.version ?? "unknown"}`,
    artifactHash: artifact?.artifactHash ?? null,
    manifestHash: manifest?.manifestHash ?? null,
    validatorVersion: "1.0.0" as const,
  });
}

function hasUnambiguousMigrationGraph(template: TemplateDefinition): boolean {
  const edges = new Set<string>();
  return (template.migrations ?? []).every((migration) => {
    const key = `${migration.kind}:${migration.fromVersion}:${migration.toVersion}`;
    if (migration.toVersion <= migration.fromVersion || edges.has(key)) return false;
    edges.add(key);
    return true;
  });
}

function isArtifactInput(input: TemplateDefinition | ArtifactInput): input is ArtifactInput {
  return "definition" in input && "artifactHash" in input && "manifest" in input;
}
