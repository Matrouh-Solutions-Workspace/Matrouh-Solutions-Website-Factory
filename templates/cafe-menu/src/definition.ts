import { contentSchema, defineTemplate, ids, z, type JsonValue } from "@factory/template-sdk";
import { cafeMenuNavigation } from "./navigation";
import { cafeMenuPages } from "./pages";
import { cafeMenuRoutes } from "./routes";
import { cafeMenuSections } from "./sections";
import { cafeMenuTheme } from "./theme";

const websiteSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Café identity, language, currency, and light or dark menu appearance.",
  schema: z.strictObject({
    logoMediaId: z.string().uuid().nullable().default(null),
    colorMode: z.enum(["light", "dark"]).default("light"),
    allowAppearanceToggle: z.boolean().default(true),
  }),
  fields: {
    "/logoMediaId": { label: "Business logo", control: "media", order: 1, mediaKinds: ["image"] },
    "/colorMode": {
      label: "Appearance",
      control: "select",
      order: 2,
      options: [
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ],
    },
    "/allowAppearanceToggle": {
      label: "Allow dark mode",
      control: "boolean",
      order: 3,
    },
  },
});

export const template = defineTemplate({
  manifest: {
    id: ids.template("com.matrouh.cafe-menu"),
    version: ids.version("1.3.0"),
    displayName: "Cafe & Restaurant QR Menu",
    author: "Matrouh Solutions",
    description:
      "A bilingual QR menu for cafés, restaurants, bakeries, and casual food businesses",
    category: "food-and-hospitality",
    previewImage: "/templates/cafe-menu/cafe-menu-cover-v2.png",
    features: [
      "digital-menu",
      "menu-management",
      "nested-categories",
      "item-variants",
      "localized-content",
      "item-media",
      "mobile-first",
      "qr-code",
      "printable-qr",
      "dark-mode",
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
  theme: cafeMenuTheme,
  routes: cafeMenuRoutes,
  pages: cafeMenuPages,
  navigation: cafeMenuNavigation,
  widgets: [],
  blocks: [],
  sections: cafeMenuSections,
  capabilities: [],
  migrations: [],
});
