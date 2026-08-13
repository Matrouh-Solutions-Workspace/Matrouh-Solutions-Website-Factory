import type {
  EditorControlId,
  EditorMetadata,
  JsonValue,
  PortableSchema,
} from "@factory/template-sdk";

export interface EditorField extends EditorMetadata {
  readonly path: string;
  readonly control: EditorControlId;
  readonly required: boolean;
  readonly jsonType: string;
}

export interface EditorSchemaDiagnostic {
  readonly code:
    "EDITOR_METADATA_UNKNOWN_PATH" | "EDITOR_METADATA_MISSING" | "EDITOR_CONTROL_INCOMPATIBLE";
  readonly path: string;
  readonly message: string;
}

export interface EditorSchemaProjection {
  readonly fields: readonly EditorField[];
  readonly diagnostics: readonly EditorSchemaDiagnostic[];
}

export function projectEditorSchema(schema: PortableSchema): EditorSchemaProjection {
  const structural = collectProperties(schema.jsonSchema);
  const diagnostics: EditorSchemaDiagnostic[] = [];
  const fields: EditorField[] = [];
  for (const [path, details] of structural) {
    const metadata = schema.fields[path];
    if (!metadata) {
      diagnostics.push({
        code: "EDITOR_METADATA_MISSING",
        path,
        message: "Editable schema property has no editor metadata",
      });
      continue;
    }
    const control = metadata.control ?? inferredControl(details.type, details.enumValues);
    if (!compatibleControl(control, details.type)) {
      diagnostics.push({
        code: "EDITOR_CONTROL_INCOMPATIBLE",
        path,
        message: `${control} is incompatible with ${details.type}`,
      });
      continue;
    }
    fields.push(
      Object.freeze({
        ...metadata,
        path,
        control,
        required: details.required,
        jsonType: details.type,
      }),
    );
  }
  for (const path of Object.keys(schema.fields)) {
    if (!structural.has(path))
      diagnostics.push({
        code: "EDITOR_METADATA_UNKNOWN_PATH",
        path,
        message: "Editor metadata does not map to a schema property",
      });
  }
  fields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.path.localeCompare(b.path));
  diagnostics.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
  return Object.freeze({ fields: Object.freeze(fields), diagnostics: Object.freeze(diagnostics) });
}

export function toEditorFields(schema: PortableSchema): readonly EditorField[] {
  const projection = projectEditorSchema(schema);
  if (projection.diagnostics.some((item) => item.code !== "EDITOR_METADATA_MISSING")) {
    throw new EditorSchemaError(projection.diagnostics);
  }
  return projection.fields;
}

export class EditorSchemaError extends Error {
  constructor(readonly diagnostics: readonly EditorSchemaDiagnostic[]) {
    super("Portable schema contains invalid editor metadata");
    this.name = "EditorSchemaError";
  }
}

interface PropertyDetails {
  readonly type: string;
  readonly enumValues: boolean;
  readonly required: boolean;
}

function collectProperties(schema: JsonValue): Map<string, PropertyDetails> {
  const output = new Map<string, PropertyDetails>();
  const visit = (node: JsonValue, path: string): void => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const record = node as Record<string, JsonValue>;
    const properties = record.properties;
    const required = new Set(
      Array.isArray(record.required)
        ? record.required.filter((item): item is string => typeof item === "string")
        : [],
    );
    if (properties && typeof properties === "object" && !Array.isArray(properties)) {
      for (const [key, value] of Object.entries(properties)) {
        const childPath = `${path}/${escapePointer(key)}`;
        const child =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, JsonValue>)
            : {};
        const type =
          typeof child.type === "string"
            ? child.type
            : Array.isArray(child.enum)
              ? "string"
              : "unknown";
        output.set(childPath, {
          type,
          enumValues: Array.isArray(child.enum),
          required: required.has(key),
        });
        visit(value, childPath);
      }
    }
  };
  visit(schema, "");
  return output;
}

function inferredControl(type: string, enumValues: boolean): EditorControlId {
  if (enumValues) return "select";
  return (
    (
      {
        boolean: "boolean",
        number: "number",
        integer: "number",
        array: "list",
        object: "group",
      } as Record<string, EditorControlId>
    )[type] ?? "text"
  );
}

function compatibleControl(control: EditorControlId, type: string): boolean {
  if (type === "unknown") return true;
  if (control === "document-import") return type === "object";
  if (control === "group") return type === "object";
  if (control === "list") return type === "array";
  if (control === "boolean") return type === "boolean";
  if (control === "number") return type === "number" || type === "integer";
  return type === "string";
}

function escapePointer(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}
