import { createHash } from "node:crypto";
import { access, readFile, readdir, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  TEMPLATE_MANIFEST_FORMAT_VERSION,
  buildPortableManifest,
  type PortableTemplateManifest,
  type TemplateDefinition,
} from "@factory/template-sdk";

export interface DiscoveryManifest {
  readonly manifestFormatVersion: number;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly packageEntry: string;
  readonly generatedManifest: string;
}

export interface TemplateCandidate {
  readonly root: string;
  readonly discovery: DiscoveryManifest;
}

export interface LoadedTemplateArtifact {
  readonly candidate: TemplateCandidate;
  readonly definition: TemplateDefinition;
  readonly manifest: PortableTemplateManifest;
  readonly artifactHash: string;
  readonly byteSize: number;
}

export class TemplateLoadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TemplateLoadError";
  }
}

export async function discoverTemplates(
  root: string,
  signal?: AbortSignal,
): Promise<TemplateCandidate[]> {
  throwIfAborted(signal);
  const safeRoot = await realpath(root);
  const entries = await readdir(safeRoot, { withFileTypes: true });
  const candidates: TemplateCandidate[] = [];
  const identities = new Set<string>();
  for (const entry of entries
    .filter((item) => item.isDirectory() && !item.isSymbolicLink())
    .sort((left, right) => left.name.localeCompare(right.name))) {
    throwIfAborted(signal);
    const templateRoot = await realpath(join(safeRoot, entry.name));
    await assertContainedRealPath(templateRoot, safeRoot);
    const manifestPath = join(templateRoot, "matrouh.template.json");
    try {
      await access(manifestPath);
    } catch {
      continue;
    }
    const raw = await readBoundedFile(manifestPath, 64_000, signal);
    const discovery = parseDiscoveryManifest(raw, manifestPath);
    await assertSafeRelative(discovery.packageEntry, templateRoot, false);
    await assertSafeRelative(discovery.generatedManifest, templateRoot, false);
    const identity = `${discovery.templateId}@${discovery.templateVersion}`;
    if (identities.has(identity)) {
      throw new TemplateLoadError("LOADER_DUPLICATE_IDENTITY", `Duplicate template ${identity}`);
    }
    identities.add(identity);
    candidates.push({ root: templateRoot, discovery });
  }
  return candidates;
}

export async function loadCatalogedTemplateArtifact(
  templatesDirectory: string,
  artifactUri: string,
  expected: { readonly templateId: string; readonly templateVersion: string },
  signal?: AbortSignal,
): Promise<LoadedTemplateArtifact> {
  throwIfAborted(signal);
  if (!artifactUri || isAbsolute(artifactUri)) {
    throw new TemplateLoadError("LOADER_ARTIFACT_URI_INVALID", "Catalog artifact URI is invalid");
  }
  const safeRoot = await realpath(templatesDirectory);
  const candidateRoot = await realpath(resolve(safeRoot, artifactUri));
  await assertContainedRealPath(candidateRoot, safeRoot);
  const manifestPath = join(candidateRoot, "matrouh.template.json");
  const discovery = parseDiscoveryManifest(
    await readBoundedFile(manifestPath, 64_000, signal),
    manifestPath,
  );
  if (
    discovery.templateId !== expected.templateId ||
    discovery.templateVersion !== expected.templateVersion
  ) {
    throw new TemplateLoadError(
      "LOADER_CATALOG_IDENTITY_MISMATCH",
      "Catalog identity does not match the exact template artifact",
    );
  }
  return loadTemplateArtifact({ root: candidateRoot, discovery }, signal);
}

export async function loadPortableManifest(
  candidate: TemplateCandidate,
  signal?: AbortSignal,
): Promise<PortableTemplateManifest> {
  const path = await assertSafeRelative(
    candidate.discovery.generatedManifest,
    candidate.root,
    true,
  );
  const raw = await readBoundedFile(path, 1_000_000, signal);
  const value = parseJson(raw, path);
  if (!isRecord(value)) {
    throw new TemplateLoadError(
      "LOADER_PORTABLE_MANIFEST_INVALID",
      "Portable manifest must be an object",
    );
  }
  const manifest = value as unknown as PortableTemplateManifest;
  if (
    manifest.manifestFormatVersion !== TEMPLATE_MANIFEST_FORMAT_VERSION ||
    manifest.manifest?.id !== candidate.discovery.templateId ||
    manifest.manifest?.version !== candidate.discovery.templateVersion ||
    typeof manifest.manifestHash !== "string" ||
    !Array.isArray(manifest.routes) ||
    !Array.isArray(manifest.pages) ||
    !Array.isArray(manifest.components) ||
    !isRecord(manifest.websiteSchema) ||
    !isRecord(manifest.theme)
  ) {
    throw new TemplateLoadError(
      "LOADER_PORTABLE_MANIFEST_INVALID",
      "Portable manifest identity or structure is invalid",
    );
  }
  return manifest;
}

export async function loadTemplateArtifact(
  candidate: TemplateCandidate,
  signal?: AbortSignal,
): Promise<LoadedTemplateArtifact> {
  throwIfAborted(signal);
  const manifest = await loadPortableManifest(candidate, signal);
  const entry = await assertSafeRelative(candidate.discovery.packageEntry, candidate.root, true);
  const [entryBytes, manifestBytes] = await Promise.all([
    readBoundedBytes(entry, 10_000_000, signal),
    readBoundedBytes(
      await assertSafeRelative(candidate.discovery.generatedManifest, candidate.root, true),
      1_000_000,
      signal,
    ),
  ]);
  throwIfAborted(signal);
  let imported: { template?: TemplateDefinition };
  try {
    imported = (await import(/* webpackIgnore: true */ pathToFileURL(entry).href)) as {
      template?: TemplateDefinition;
    };
  } catch (error) {
    throw new TemplateLoadError("LOADER_EXECUTABLE_IMPORT_FAILED", "Template import failed", {
      cause: error,
    });
  }
  if (!imported.template) {
    throw new TemplateLoadError("LOADER_EXPORT_MISSING", "Template package must export `template`");
  }
  if (
    imported.template.manifest.id !== candidate.discovery.templateId ||
    imported.template.manifest.version !== candidate.discovery.templateVersion
  ) {
    throw new TemplateLoadError(
      "LOADER_IDENTITY_MISMATCH",
      "Executable identity does not match discovery",
    );
  }
  const rebuilt = buildPortableManifest(imported.template);
  if (rebuilt.manifestHash !== manifest.manifestHash) {
    throw new TemplateLoadError(
      "LOADER_MANIFEST_EXECUTABLE_MISMATCH",
      "Generated manifest does not match executable definition",
    );
  }
  return Object.freeze({
    candidate,
    definition: imported.template,
    manifest,
    artifactHash: createHash("sha256").update(manifestBytes).update(entryBytes).digest("hex"),
    byteSize: manifestBytes.byteLength + entryBytes.byteLength,
  });
}

export async function loadTemplate(
  candidate: TemplateCandidate,
  signal?: AbortSignal,
): Promise<TemplateDefinition> {
  return (await loadTemplateArtifact(candidate, signal)).definition;
}

function parseDiscoveryManifest(raw: string, path: string): DiscoveryManifest {
  const value = parseJson(raw, path);
  if (!isRecord(value)) {
    throw new TemplateLoadError("LOADER_DISCOVERY_INVALID", "Discovery manifest must be an object");
  }
  const allowed = new Set([
    "manifestFormatVersion",
    "templateId",
    "templateVersion",
    "packageEntry",
    "generatedManifest",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TemplateLoadError("LOADER_DISCOVERY_INVALID", "Unknown discovery manifest field");
  }
  if (
    value.manifestFormatVersion !== TEMPLATE_MANIFEST_FORMAT_VERSION ||
    typeof value.templateId !== "string" ||
    !/^[a-z0-9][a-z0-9.-]{2,159}$/.test(value.templateId) ||
    typeof value.templateVersion !== "string" ||
    !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value.templateVersion) ||
    typeof value.packageEntry !== "string" ||
    typeof value.generatedManifest !== "string"
  ) {
    throw new TemplateLoadError("LOADER_DISCOVERY_INVALID", "Discovery manifest is invalid");
  }
  return {
    manifestFormatVersion: value.manifestFormatVersion,
    templateId: value.templateId,
    templateVersion: value.templateVersion,
    packageEntry: value.packageEntry,
    generatedManifest: value.generatedManifest,
  };
}

function parseJson(raw: string, path: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new TemplateLoadError("LOADER_JSON_INVALID", `Malformed JSON: ${path}`, { cause: error });
  }
}

async function readBoundedFile(path: string, maximumBytes: number, signal?: AbortSignal) {
  const bytes = await readBoundedBytes(path, maximumBytes, signal);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function readBoundedBytes(path: string, maximumBytes: number, signal?: AbortSignal) {
  throwIfAborted(signal);
  const information = await stat(path);
  if (!information.isFile() || information.size > maximumBytes) {
    throw new TemplateLoadError("LOADER_ARTIFACT_TOO_LARGE", `Artifact exceeds limit: ${path}`);
  }
  const bytes = await readFile(path);
  throwIfAborted(signal);
  return bytes;
}

async function assertSafeRelative(path: string, root: string, mustExist: boolean): Promise<string> {
  if (isAbsolute(path) || path.includes("\0")) {
    throw new TemplateLoadError("LOADER_PATH_ESCAPE", "Artifact path must be package-relative");
  }
  const resolved = resolve(root, path);
  assertContained(resolved, root);
  if (!mustExist) return resolved;
  let actual: string;
  try {
    actual = await realpath(resolved);
  } catch (error) {
    throw new TemplateLoadError("LOADER_ARTIFACT_MISSING", "Template artifact is missing", {
      cause: error,
    });
  }
  await assertContainedRealPath(actual, root);
  return actual;
}

function assertContained(path: string, root: string): void {
  const difference = relative(resolve(root), resolve(path));
  if (difference.startsWith("..") || isAbsolute(difference)) {
    throw new TemplateLoadError("LOADER_PATH_ESCAPE", "Artifact path escapes template root");
  }
}

async function assertContainedRealPath(path: string, root: string): Promise<void> {
  const [actualPath, actualRoot] = await Promise.all([realpath(path), realpath(root)]);
  assertContained(actualPath, actualRoot);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new TemplateLoadError("LOADER_ABORTED", "Template operation aborted");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
