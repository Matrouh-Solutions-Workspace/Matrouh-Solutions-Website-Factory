import {
  contentSchema,
  defineTemplate,
  ids,
  z,
  type JsonValue,
  type ThemeTokens,
} from "@factory/template-sdk";
const heroId = ids.section("com.matrouh.clinic/section/hero"),
  locationsId = ids.section("com.matrouh.clinic/section/locations"),
  homeId = ids.page("com.matrouh.clinic/page/home"),
  locationsPageId = ids.page("com.matrouh.clinic/page/locations");
const jsonSchema = contentSchema<JsonValue>({ version: 1, schema: z.record(z.string(), z.json()) });
const sectionSchema = contentSchema<JsonValue>({
  version: 1,
  schema: z.object({
    title: z.string().min(1),
    body: z.string(),
    items: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })).default([]),
  }),
});
const field = (value: Readonly<JsonValue>, key: string): string =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as Readonly<Record<string, JsonValue>>)[key] === "string"
    ? ((value as Readonly<Record<string, JsonValue>>)[key] as string)
    : "";
const themeDefaults: ThemeTokens = {
  colors: {
    background: "#f5f7ff",
    surface: "#ffffff",
    surfaceVariant: "#e8ecff",
    primary: "#3448c5",
    primaryForeground: "#ffffff",
    secondary: "#172044",
    accent: "#14a3a3",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#d4d9f5",
    muted: "#667085",
    text: "#20243a",
    heading: "#12172e",
  },
  layout: {
    radii: { card: ".75rem" },
    shadows: { card: "0 10px 30px rgba(18,23,46,.12)" },
    spacing: { section: "4.5rem" },
    containerWidths: { page: "76rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: { body: "Arial, sans-serif", heading: "Arial, sans-serif" },
    fontSizes: { body: "1rem", hero: "clamp(2.25rem,5vw,4.5rem)" },
    fontWeights: { normal: 400, bold: 750 },
    lineHeights: { body: 1.6, heading: 1.08 },
  },
  motion: {
    durations: { fast: "140ms", normal: "220ms" },
    curves: { standard: "cubic-bezier(.2,.8,.2,1)" },
  },
};
const themeSchema = contentSchema<ThemeTokens>({
  version: 1,
  schema: z.custom<ThemeTokens>((value) => typeof value === "object" && value !== null),
});
export const template = defineTemplate({
  manifest: {
    id: ids.template("com.matrouh.clinic"),
    version: ids.version("1.0.0"),
    displayName: "Multi-specialty Clinic",
    author: "Matrouh Solutions",
    description: "Structured multi-location clinic template",
    category: "healthcare",
  },
  compatibility: {
    sdkVersion: "1.0.0",
    minimumFactoryVersion: "0.1.0",
    minimumRendererVersion: "0.1.0",
    contentSchemaVersion: 1,
    themeSchemaVersion: 1,
    publicationSnapshotVersion: 1,
  },
  websiteSchema: jsonSchema,
  theme: {
    id: ids.theme("com.matrouh.clinic/theme/default"),
    schemaVersion: 1,
    schema: themeSchema,
    defaults: themeDefaults,
  },
  routes: [
    {
      id: ids.route("com.matrouh.clinic/route/page"),
      pattern: "/:slug?",
      priority: 0,
      pageTypes: [homeId, locationsPageId],
    },
  ],
  pages: [
    {
      id: homeId,
      title: "Home",
      slug: { kind: "fixed", defaultValue: "/" },
      allowedSections: [heroId, locationsId],
      requiredSections: [{ sectionTypeId: heroId, minimum: 1 }],
      defaultSections: [{ sectionTypeId: heroId }],
      supportsSEO: true,
      supportsNavigation: true,
      supportsIndexing: true,
    },
    {
      id: locationsPageId,
      title: "Locations",
      slug: { kind: "fixed", defaultValue: "locations" },
      allowedSections: [locationsId],
      requiredSections: [{ sectionTypeId: locationsId, minimum: 1 }],
      defaultSections: [{ sectionTypeId: locationsId }],
      supportsSEO: true,
      supportsNavigation: true,
      supportsIndexing: true,
    },
  ],
  navigation: [
    {
      id: ids.navigation("com.matrouh.clinic/navigation/main"),
      title: "Main navigation",
      maximumDepth: 3,
      allowedPageTypes: "all",
      ordering: "manual",
      visibilitySchema: jsonSchema,
      localization: "localized-tree",
      allowedNodeKinds: ["page", "external", "label"],
    },
  ],
  widgets: [],
  blocks: [],
  sections: [
    {
      id: heroId,
      title: "Clinic hero",
      schema: sectionSchema,
      defaults: {
        title: "Care for every stage of life",
        body: "Specialists working together around your needs.",
        items: [],
      },
      render: ({ value }) => (
        <section className="hero">
          <h1>{field(value, "title")}</h1>
          <p>{field(value, "body")}</p>
        </section>
      ),
    },
    {
      id: locationsId,
      title: "Locations",
      schema: sectionSchema,
      defaults: { title: "Find a clinic", body: "Convenient care near you.", items: [] },
      render: ({ value }) => (
        <section>
          <h2>{field(value, "title")}</h2>
          <p>{field(value, "body")}</p>
        </section>
      ),
    },
  ],
  migrations: [],
});
