import type { PortableSchema, PortableTemplateManifest } from "@factory/template-sdk";
export interface ComponentMetadata {
  artifactId: string;
  ownerId: string;
  ownerVersion: string;
  kind: "widget" | "block" | "section" | "theme" | "plugin";
  componentId: string;
  title: string;
  schema: PortableSchema;
}
export function projectComponents(
  manifest: PortableTemplateManifest,
  artifactId: string,
): ComponentMetadata[] {
  return manifest.components.map((item) => ({
    artifactId,
    ownerId: manifest.manifest.id,
    ownerVersion: manifest.manifest.version,
    kind: item.kind,
    componentId: item.id,
    title: item.title,
    schema: item.schema,
  }));
}
export interface ComponentCatalog {
  replaceArtifact(artifactId: string, items: readonly ComponentMetadata[]): Promise<void>;
  search(text: string): Promise<readonly ComponentMetadata[]>;
}
