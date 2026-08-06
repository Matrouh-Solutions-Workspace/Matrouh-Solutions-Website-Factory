import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { sharedButtonId, sharedInfoCardId } from "@templates/shared";
import { clinicHeroId, clinicLocationsId } from "../ids";

const field = (value: Readonly<JsonValue>, key: string): string =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as Readonly<Record<string, JsonValue>>)[key] === "string"
    ? ((value as Readonly<Record<string, JsonValue>>)[key] as string)
    : "";

const heroSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Clinic introduction and primary action.",
  schema: z.strictObject({
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(600),
    ctaLabel: z.string().min(1).max(40),
    ctaHref: z
      .string()
      .min(1)
      .max(240)
      .regex(/^\/(?:[a-z0-9/_-]*)$/i),
  }),
  fields: {
    "/title": { label: "Headline", control: "text", order: 1, localization: "value" },
    "/body": { label: "Introduction", control: "textarea", order: 2, localization: "value" },
    "/ctaLabel": { label: "Action label", control: "text", order: 3, localization: "value" },
    "/ctaHref": { label: "Action destination", control: "url", order: 4 },
  },
});

const locationsSchema = contentSchema<JsonValue>({
  version: 1,
  description: "A bounded list of clinic locations.",
  schema: z.strictObject({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    items: z
      .array(
        z.strictObject({
          id: z.string().uuid(),
          title: z.string().min(1).max(100),
          body: z.string().min(1).max(500),
        }),
      )
      .max(20),
  }),
  fields: {
    "/title": { label: "Section title", control: "text", order: 1, localization: "value" },
    "/body": { label: "Introduction", control: "textarea", order: 2, localization: "value" },
    "/items": { label: "Locations", control: "list", order: 3, localization: "value" },
  },
});

export const clinicSections: readonly SectionDefinition[] = [
  {
    id: clinicHeroId,
    title: "Clinic hero",
    description: "Primary clinic introduction.",
    category: "marketing",
    schema: heroSchema,
    defaults: {
      title: "Care for every stage of life",
      body: "Specialists working together around your needs.",
      ctaLabel: "Find a location",
      ctaHref: "/locations",
    },
    composedOf: [sharedButtonId],
    render: ({ value, context }) => (
      <section className="hero">
        <h1>{field(value, "title")}</h1>
        <p>{field(value, "body")}</p>
        <a className="action action--primary" href={context.links.url(field(value, "ctaHref"))}>
          {field(value, "ctaLabel")}
        </a>
      </section>
    ),
  },
  {
    id: clinicLocationsId,
    title: "Locations",
    description: "Clinic locations and contact overview.",
    category: "content",
    schema: locationsSchema,
    defaults: { title: "Find a clinic", body: "Convenient care near you.", items: [] },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section>
        <h2>{field(value, "title")}</h2>
        <p>{field(value, "body")}</p>
      </section>
    ),
  },
];
