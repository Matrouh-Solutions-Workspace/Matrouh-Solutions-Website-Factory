import {
  contentSchema,
  ids,
  z,
  type JsonValue,
  type NavigationDefinition,
} from "@factory/template-sdk";

const visibility = contentSchema<JsonValue>({
  version: 1,
  schema: z.strictObject({ visible: z.boolean().default(true) }),
  description: "Navigation visibility state.",
  fields: { "/visible": { label: "Visible", control: "boolean" } },
});

export const clinicNavigation: readonly NavigationDefinition[] = [
  {
    id: ids.navigation("com.matrouh.clinic/navigation/main"),
    title: "Main navigation",
    maximumDepth: 3,
    allowedPageTypes: "all",
    ordering: "manual",
    visibilitySchema: visibility,
    localization: "localized-tree",
    allowedNodeKinds: ["page", "external", "label"],
    editor: { description: "Header and mobile navigation" },
  },
];
