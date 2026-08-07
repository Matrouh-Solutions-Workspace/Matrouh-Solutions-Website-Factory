import { contentSchema, defineTemplate, ids, z, type JsonValue } from "@factory/template-sdk";
import { sharedButton, sharedInfoCard } from "@templates/shared";
import { clinicNavigation } from "./navigation";
import { clinicPages } from "./pages";
import { clinicRoutes } from "./routes";
import { clinicSections } from "./sections";
import { clinicTheme } from "./theme";

const websiteSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Public clinic contact settings.",
  schema: z.strictObject({
    centralPhone: z.string().min(3).max(40).default("+20 100 000 0000"),
    centralEmail: z.string().email().max(320).default("clinic@example.com"),
    bookingPath: z
      .string()
      .regex(/^\/(?:[a-z0-9/_-]*)$/i)
      .default("/book"),
    emergencyNotice: z.string().max(300).default(""),
    colorMode: z.enum(["light", "dark"]).default("light"),
    logoMediaId: z.string().uuid().nullable().default(null),
  }),
  fields: {
    "/centralPhone": { label: "Central phone", control: "text", order: 1 },
    "/centralEmail": { label: "Central email", control: "text", order: 2, sensitive: true },
    "/bookingPath": { label: "Booking path", control: "url", order: 3 },
    "/emergencyNotice": {
      label: "Emergency notice",
      control: "textarea",
      order: 4,
      localization: "value",
    },
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
    id: ids.template("com.matrouh.clinic"),
    version: ids.version("2.0.0"),
    displayName: "Multi-specialty Clinic",
    author: "Matrouh Solutions",
    description: "Connected multi-specialty clinic with care pathways, specialty discovery, booking, and live maps",
    category: "healthcare",
    features: [
      "localized-content",
      "multi-location",
      "specialty-directory",
      "care-pathways",
      "semantic-theme",
      "seo",
      "google-maps",
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
  theme: clinicTheme,
  routes: clinicRoutes,
  pages: clinicPages,
  navigation: clinicNavigation,
  widgets: [sharedButton],
  blocks: [sharedInfoCard],
  sections: clinicSections,
  capabilities: [],
  migrations: [],
});
