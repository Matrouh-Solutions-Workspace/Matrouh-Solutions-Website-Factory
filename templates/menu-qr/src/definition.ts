import { contentSchema, defineTemplate, ids, z, type JsonValue } from "@factory/template-sdk";
import { menuQrNavigation } from "./navigation";
import { menuQrPages } from "./pages";
import { menuQrRoutes } from "./routes";
import { menuQrSections } from "./sections";
import { menuQrTheme } from "./theme";
const websiteSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Identity settings for a simple QR menu.",
  schema: z.strictObject({ siteName: z.string().min(1).max(120).default("Our menu") }),
  fields: { "/siteName": { label: "Website name", control: "text", order: 1 } },
});
export const template = defineTemplate({
  manifest: {
    id: ids.template("com.matrouh.menu-qr"),
    version: ids.version("1.0.0"),
    displayName: "Menu QR",
    author: "Matrouh Solutions",
    description: "A clean QR destination for one uploaded PDF or photo menu.",
    category: "restaurant",
    previewImage: "/templates/menu-qr/menu-qr-cover.png",
    features: ["qr-menu", "uploaded-menu", "pdf-viewer", "image-menu", "responsive"],
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
  theme: menuQrTheme,
  routes: menuQrRoutes,
  pages: menuQrPages,
  navigation: menuQrNavigation,
  widgets: [],
  blocks: [],
  sections: menuQrSections,
  capabilities: [],
  migrations: [],
});
