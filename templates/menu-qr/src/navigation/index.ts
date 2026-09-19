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
  description: "Navigation visibility.",
  fields: { "/visible": { label: "Visible", control: "boolean" } },
});
export const menuQrNavigation: readonly NavigationDefinition[] = [
  {
    id: ids.navigation("com.matrouh.menu-qr/navigation/main"),
    title: "Main navigation",
    maximumDepth: 1,
    allowedPageTypes: "all",
    ordering: "manual",
    visibilitySchema: visibility,
    localization: "localized-labels",
    allowedNodeKinds: ["page"],
    editor: { description: "Menu navigation" },
  },
];
