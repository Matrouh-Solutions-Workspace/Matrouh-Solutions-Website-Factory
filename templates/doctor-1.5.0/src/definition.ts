import { contentSchema, defineTemplate, ids, z, type JsonValue } from "@factory/template-sdk";
import { sharedButton, sharedInfoCard } from "@templates/shared";
import { doctorNavigation } from "./navigation";
import { doctorPages } from "./pages";
import { doctorRoutes } from "./routes";
import { doctorSections } from "./sections";
import { doctorTheme } from "./theme";

const websiteSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Public practice contact settings.",
  schema: z.strictObject({
    phone: z.string().min(3).max(40).default("+20 100 000 0000"),
    email: z.string().email().max(320).default("doctor@example.com"),
    address: z.string().min(1).max(300).default("Matrouh, Egypt"),
    appointmentPath: z
      .string()
      .regex(/^\/(?:[a-z0-9/_-]*)$/i)
      .default("/contact"),
    colorMode: z.enum(["light", "dark"]).default("light"),
    logoMediaId: z.string().uuid().nullable().default(null),
  }),
  fields: {
    "/phone": { label: "Phone", control: "text", order: 1 },
    "/email": { label: "Email", control: "text", order: 2, sensitive: true },
    "/address": { label: "Address", control: "textarea", order: 3, localization: "value" },
    "/appointmentPath": { label: "Appointment path", control: "url", order: 4 },
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
    id: ids.template("com.matrouh.doctor"),
    version: ids.version("1.5.0"),
    displayName: "Doctor Practice",
    author: "Matrouh Solutions",
    description: "Editorial personal medical practice with appointments and a live location map",
    category: "healthcare",
    features: ["localized-content", "semantic-theme", "seo", "contact-page", "google-maps"],
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
  theme: doctorTheme,
  routes: doctorRoutes,
  pages: doctorPages,
  navigation: doctorNavigation,
  widgets: [sharedButton],
  blocks: [sharedInfoCard],
  sections: doctorSections,
  capabilities: [],
  migrations: [],
});
