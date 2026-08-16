import { contentSchema, defineTemplate, ids, z, type JsonValue } from "@factory/template-sdk";
import { sharedButton, sharedInfoCard } from "@templates/shared";
import { creativeNavigation } from "./navigation";
import { creativePages } from "./pages";
import { creativeRoutes } from "./routes";
import { creativeSections } from "./sections";
import { creativeTheme } from "./theme";

const websiteSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Creative studio identity and contact settings.",
  schema: z.strictObject({
    email: z.string().email().max(320).default("hello@studio.example"),
    phone: z.string().min(3).max(40).default("+20 100 000 0000"),
    location: z.string().min(1).max(200).default("Cairo, Egypt / Available worldwide"),
    enquiryPath: z
      .string()
      .regex(/^\/(?:[a-z0-9/_-]*)$/i)
      .default("/contact"),
    colorMode: z.enum(["light", "dark"]).default("light"),
    logoMediaId: z.string().uuid().nullable().default(null),
  }),
  fields: {
    "/email": { label: "Email", control: "text", order: 1, sensitive: true },
    "/phone": { label: "Phone", control: "text", order: 2 },
    "/location": { label: "Location", control: "text", order: 3, localization: "value" },
    "/enquiryPath": { label: "Enquiry path", control: "url", order: 4 },
    "/colorMode": {
      label: "Template appearance",
      control: "select",
      order: 5,
      options: [
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ],
    },
    "/logoMediaId": { label: "Custom logo", control: "media", order: 6, mediaKinds: ["image"] },
  },
});

export const template = defineTemplate({
  manifest: {
    id: ids.template("com.matrouh.creative"),
    version: ids.version("1.0.1"),
    displayName: "Studio Folio",
    author: "Matrouh Solutions",
    description:
      "Editorial portfolio for designers, creative directors, photographers, and independent studios",
    category: "portfolio",
    features: [
      "localized-content",
      "editorial-hero",
      "portrait-media",
      "case-studies",
      "services",
      "creative-process",
      "testimonials",
      "semantic-theme",
      "seo",
      "contact-page",
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
  theme: creativeTheme,
  routes: creativeRoutes,
  pages: creativePages,
  navigation: creativeNavigation,
  widgets: [sharedButton],
  blocks: [sharedInfoCard],
  sections: creativeSections,
  capabilities: [],
  migrations: [],
});
