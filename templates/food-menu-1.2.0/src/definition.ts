import { contentSchema, defineTemplate, ids, z, type JsonValue } from "@factory/template-sdk";
import { foodMenuNavigation } from "./navigation";
import { foodMenuPages } from "./pages";
import { foodMenuRoutes } from "./routes";
import { foodMenuSections } from "./sections";
import { foodMenuTheme } from "./theme";

const websiteSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Restaurant identity, language, currency, and menu display settings.",
  schema: z.strictObject({
    logoMediaId: z.string().uuid().nullable().default(null),
    colorMode: z.literal("light").default("light"),
    allowAppearanceToggle: z.literal(false).default(false),
  }),
  fields: {
    "/logoMediaId": { label: "Business logo", control: "media", order: 1, mediaKinds: ["image"] },
    "/colorMode": {
      label: "Appearance",
      control: "text",
      order: 2,
      readOnlyWhen: { path: "/colorMode", operator: "present" },
    },
    "/allowAppearanceToggle": {
      label: "Allow dark mode",
      control: "boolean",
      order: 3,
      readOnlyWhen: { path: "/allowAppearanceToggle", operator: "present" },
    },
  },
});

export const template = defineTemplate({
  manifest: {
    id: ids.template("com.matrouh.food-menu"),
    version: ids.version("1.2.0"),
    displayName: "Saffron — Food & Café Menu",
    author: "Matrouh Solutions",
    description:
      "A mobile-first bilingual digital menu for restaurants, cafés, bakeries, and food businesses",
    category: "food-and-hospitality",
    previewImage: "/templates/food-menu/food-cafe-hero.jpg",
    features: [
      "digital-menu",
      "menu-management",
      "nested-categories",
      "item-variants",
      "localized-content",
      "item-media",
      "pdf-import-review",
      "mobile-first",
      "qr-ready",
      "claim-ready",
      "semantic-theme",
      "seo",
    ],
  },
  compatibility: {
    sdkVersion: "1.0.0",
    minimumFactoryVersion: "0.1.0",
    minimumRendererVersion: "0.1.0",
    contentSchemaVersion: 1,
    themeSchemaVersion: 1,
    publicationSnapshotVersion: 1,
  },
  websiteSchema,
  theme: foodMenuTheme,
  routes: foodMenuRoutes,
  pages: foodMenuPages,
  navigation: foodMenuNavigation,
  widgets: [],
  blocks: [],
  sections: foodMenuSections,
  capabilities: [],
  migrations: [],
});
