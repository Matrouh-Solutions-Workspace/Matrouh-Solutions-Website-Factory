import { access, readdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { TemplateDefinition } from "@factory/template-sdk";
export interface DiscoveryManifest {
  manifestFormatVersion: number;
  templateId: string;
  templateVersion: string;
  packageEntry: string;
  generatedManifest: string;
}
export interface TemplateCandidate {
  root: string;
  discovery: DiscoveryManifest;
}
export class TemplateLoadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TemplateLoadError";
  }
}
export async function discoverTemplates(root: string): Promise<TemplateCandidate[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const candidates: TemplateCandidate[] = [];
  for (const entry of entries
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const templateRoot = join(root, entry.name),
      manifestPath = join(templateRoot, "matrouh.template.json");
    try {
      await access(manifestPath);
    } catch {
      continue;
    }
    const raw = await readFile(manifestPath, "utf8");
    if (raw.length > 64_000) throw new TemplateLoadError("LOADER_MANIFEST_TOO_LARGE", manifestPath);
    const discovery = JSON.parse(raw) as DiscoveryManifest;
    assertSafeRelative(discovery.packageEntry, templateRoot);
    assertSafeRelative(discovery.generatedManifest, templateRoot);
    candidates.push({ root: templateRoot, discovery });
  }
  return candidates;
}
export async function loadTemplate(candidate: TemplateCandidate): Promise<TemplateDefinition> {
  const entry = resolve(candidate.root, candidate.discovery.packageEntry);
  assertContained(entry, candidate.root);
  const module = (await import(/* webpackIgnore: true */ pathToFileURL(entry).href)) as {
    template?: TemplateDefinition;
  };
  if (!module.template)
    throw new TemplateLoadError("LOADER_EXPORT_MISSING", "Template package must export `template`");
  return module.template;
}
function assertSafeRelative(path: string, root: string): void {
  if (isAbsolute(path)) throw new TemplateLoadError("LOADER_PATH_ESCAPE", path);
  assertContained(resolve(root, path), root);
}
function assertContained(path: string, root: string): void {
  const diff = relative(resolve(root), normalize(path));
  if (diff.startsWith("..") || isAbsolute(diff))
    throw new TemplateLoadError("LOADER_PATH_ESCAPE", dirname(path));
}
