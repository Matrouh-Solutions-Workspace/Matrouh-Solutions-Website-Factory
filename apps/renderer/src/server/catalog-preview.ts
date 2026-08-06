import { cache } from "react";
import { compilePublication, createDefaultTemplateDraft } from "@factory/publication-compiler";
import { instantiateTemplateRuntime } from "@factory/template-runtime";
import { loadCatalogTemplateArtifact } from "./site";

export const loadCatalogPreview = cache(async function loadCatalogPreview(
  templateId: string,
  templateVersion: string,
  pathname: string,
) {
  const artifact = await loadCatalogTemplateArtifact(templateId, templateVersion);
  if (!artifact) return null;
  const compilation = compilePublication(
    createDefaultTemplateDraft(artifact.definition, artifact.artifactHash),
    artifact.definition,
    artifact.artifactHash,
    artifact.manifest.manifestHash,
  );
  if (!compilation.success) return null;
  const prefix = `/template-preview/${encodeURIComponent(templateId)}/${encodeURIComponent(templateVersion)}`;
  const runtime = instantiateTemplateRuntime(
    {
      definition: artifact.definition,
      artifactHash: artifact.artifactHash,
      manifestHash: artifact.manifest.manifestHash,
      linkResolver: (value) => previewLink(value, prefix),
    },
    compilation.snapshot,
  );
  const selectedPath = runtime.resolveRoute(pathname)
    ? pathname
    : (compilation.snapshot.routes[0]?.pathname ?? "/");
  return {
    snapshot: compilation.snapshot,
    rendered: runtime.render(selectedPath),
    prefix,
  };
});

function previewLink(value: string, prefix: string): string {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return `${prefix}${value}`;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "#";
  } catch {
    return "#";
  }
}
