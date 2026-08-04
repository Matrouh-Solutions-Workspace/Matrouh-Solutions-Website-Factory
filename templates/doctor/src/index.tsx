import {
  contentSchema,
  defineTemplate,
  ids,
  z,
  type JsonValue,
  type ThemeTokens,
} from "@factory/template-sdk";

const heroId = ids.section("com.matrouh.doctor/section/hero");
const servicesId = ids.section("com.matrouh.doctor/section/services");
const homeId = ids.page("com.matrouh.doctor/page/home");
const jsonSchema = contentSchema<JsonValue>({ version: 1, schema: z.record(z.string(), z.json()) });
const heroSchema = contentSchema<JsonValue>({
  version: 1,
  schema: z.object({
    eyebrow: z.string().max(80),
    title: z.string().min(1).max(120),
    body: z.string().max(600),
    ctaLabel: z.string().max(40),
  }),
  fields: {
    "/title": { label: "Headline", control: "text", aiHint: "Clear patient-focused headline" },
    "/body": { label: "Introduction", control: "textarea" },
  },
});
const servicesSchema = contentSchema<JsonValue>({
  version: 1,
  schema: z.object({
    title: z.string(),
    items: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })).max(12),
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
    background: "#f7fbfa",
    surface: "#ffffff",
    surfaceVariant: "#e7f4f1",
    primary: "#087f6d",
    primaryForeground: "#ffffff",
    secondary: "#16324f",
    accent: "#e99f4c",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#c9ded9",
    muted: "#657a76",
    text: "#1a2b28",
    heading: "#0e2924",
  },
  layout: {
    radii: { card: "1rem" },
    shadows: { card: "0 12px 40px rgba(14,41,36,.10)" },
    spacing: { section: "5rem" },
    containerWidths: { page: "72rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: { body: "Arial, sans-serif", heading: "Georgia, serif" },
    fontSizes: { body: "1rem", hero: "clamp(2.5rem,6vw,5rem)" },
    fontWeights: { normal: 400, bold: 700 },
    lineHeights: { body: 1.6, heading: 1.05 },
  },
  motion: {
    durations: { fast: "150ms", normal: "250ms" },
    curves: { standard: "cubic-bezier(.2,.8,.2,1)" },
  },
};
const themeSchema = contentSchema<ThemeTokens>({
  version: 1,
  schema: z.custom<ThemeTokens>((value) => typeof value === "object" && value !== null),
});

export const template = defineTemplate({
  manifest: {
    id: ids.template("com.matrouh.doctor"),
    version: ids.version("1.0.0"),
    displayName: "Doctor Practice",
    author: "Matrouh Solutions",
    description: "Calm, trustworthy personal medical practice template",
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
    id: ids.theme("com.matrouh.doctor/theme/default"),
    schemaVersion: 1,
    schema: themeSchema,
    defaults: themeDefaults,
  },
  routes: [
    {
      id: ids.route("com.matrouh.doctor/route/page"),
      pattern: "/:slug?",
      priority: 0,
      pageTypes: [homeId],
    },
  ],
  pages: [
    {
      id: homeId,
      title: "Home",
      slug: { kind: "fixed", defaultValue: "/" },
      allowedSections: [heroId, servicesId],
      requiredSections: [{ sectionTypeId: heroId, minimum: 1, maximum: 1 }],
      defaultSections: [{ sectionTypeId: heroId }, { sectionTypeId: servicesId }],
      supportsSEO: true,
      supportsNavigation: true,
      supportsIndexing: true,
    },
  ],
  navigation: [
    {
      id: ids.navigation("com.matrouh.doctor/navigation/main"),
      title: "Main navigation",
      maximumDepth: 2,
      allowedPageTypes: "all",
      ordering: "manual",
      visibilitySchema: jsonSchema,
      localization: "localized-labels",
      allowedNodeKinds: ["page", "external"],
    },
  ],
  widgets: [],
  blocks: [],
  sections: [
    {
      id: heroId,
      title: "Hero",
      schema: heroSchema,
      defaults: {
        eyebrow: "Personal care",
        title: "Care centered around you",
        body: "Thoughtful medical care with time to listen.",
        ctaLabel: "Book an appointment",
      },
      render: ({ value }) => (
        <section className="hero">
          <p>{field(value, "eyebrow")}</p>
          <h1>{field(value, "title")}</h1>
          <p>{field(value, "body")}</p>
        </section>
      ),
    },
    {
      id: servicesId,
      title: "Services",
      schema: servicesSchema,
      defaults: { title: "How I can help", items: [] },
      render: ({ value }) => (
        <section>
          <h2>{field(value, "title")}</h2>
        </section>
      ),
    },
  ],
  migrations: [],
});
