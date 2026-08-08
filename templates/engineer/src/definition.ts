import { contentSchema, defineTemplate, ids, z, type JsonValue } from "@factory/template-sdk";
import { sharedButton, sharedInfoCard } from "@templates/shared";
import { engineerNavigation } from "./navigation";
import { engineerPages } from "./pages";
import { engineerRoutes } from "./routes";
import { engineerSections } from "./sections";
import { engineerTheme } from "./theme";

const websiteSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Professional contact and enquiry settings.",
  schema: z.strictObject({
    email: z.string().email().max(320).default("studio@example.com"),
    phone: z.string().min(3).max(40).default("+20 100 000 0000"),
    location: z.string().min(1).max(200).default("Matrouh, Egypt"),
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
    id: ids.template("com.matrouh.engineer"),
    version: ids.version("2.0.0"),
    displayName: "Engineer Portfolio",
    author: "Matrouh Solutions",
    description:
      "Project-led engineering studio with technical process, sectors, credentials, and measurable outcomes",
    category: "professional-services",
    features: [
      "localized-content",
      "project-portfolio",
      "engineering-process",
      "technical-credentials",
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
  theme: engineerTheme,
  routes: engineerRoutes,
  pages: engineerPages,
  navigation: engineerNavigation,
  widgets: [sharedButton],
  blocks: [sharedInfoCard],
  sections: engineerSections,
  capabilities: [],
  migrations: [],
});
