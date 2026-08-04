import type { PortableSchema } from "@factory/template-sdk";
export interface EditorField {
  path: string;
  label: string;
  control: string;
  description?: string;
  order: number;
}
export function toEditorFields(schema: PortableSchema): EditorField[] {
  return Object.entries(schema.fields)
    .map(([path, item]) => ({
      path,
      label: item.label,
      control: item.control ?? "text",
      ...(item.description === undefined ? {} : { description: item.description }),
      order: item.order ?? 0,
    }))
    .sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
}
