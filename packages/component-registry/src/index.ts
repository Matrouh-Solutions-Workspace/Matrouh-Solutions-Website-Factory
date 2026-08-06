import type { PortableSchema, PortableTemplateManifest } from "@factory/template-sdk";

export interface ComponentMetadata {
  readonly artifactId: string;
  readonly ownerId: string;
  readonly ownerVersion: string;
  readonly kind: "widget" | "block" | "section" | "theme" | "plugin";
  readonly componentId: string;
  readonly title: string;
  readonly description?: string;
  readonly category?: string;
  readonly schema: PortableSchema;
  readonly capabilities: readonly string[];
  readonly searchText: string;
}

export function projectComponents(
  manifest: PortableTemplateManifest,
  artifactId: string,
): ComponentMetadata[] {
  const components: ComponentMetadata[] = manifest.components.map((item) =>
    metadata({
      artifactId,
      ownerId: manifest.manifest.id,
      ownerVersion: manifest.manifest.version,
      kind: item.kind,
      componentId: item.id,
      title: item.title,
      ...(item.description === undefined ? {} : { description: item.description }),
      ...(item.category === undefined ? {} : { category: item.category }),
      schema: item.schema,
      capabilities: item.capabilities.map((capability) => capability.id as string),
    }),
  );
  components.push(
    metadata({
      artifactId,
      ownerId: manifest.manifest.id,
      ownerVersion: manifest.manifest.version,
      kind: "theme",
      componentId: manifest.theme.id,
      title: `${manifest.manifest.displayName} theme`,
      category: "theme",
      schema: manifest.theme.schema,
      capabilities: [],
    }),
  );
  return components.sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) || left.componentId.localeCompare(right.componentId),
  );
}

export interface ComponentCatalog {
  replaceArtifact(artifactId: string, items: readonly ComponentMetadata[]): Promise<void>;
  search(query: ComponentSearchQuery): Promise<readonly ComponentMetadata[]>;
}

export interface ComponentSearchQuery {
  readonly text?: string;
  readonly kinds?: readonly ComponentMetadata["kind"][];
  readonly ownerId?: string;
  readonly capability?: string;
  readonly limit?: number;
}

function metadata(input: Omit<ComponentMetadata, "searchText">): ComponentMetadata {
  const searchText = [
    input.ownerId,
    input.kind,
    input.componentId,
    input.title,
    input.description,
    input.category,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US");
  return Object.freeze({ ...input, searchText });
}
