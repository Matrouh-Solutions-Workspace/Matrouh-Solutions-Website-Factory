import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { sharedButtonId, sharedInfoCardId } from "@templates/shared";
import { doctorHeroId, doctorServicesId } from "../ids";

const field = (value: Readonly<JsonValue>, key: string): string =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as Readonly<Record<string, JsonValue>>)[key] === "string"
    ? ((value as Readonly<Record<string, JsonValue>>)[key] as string)
    : "";

const heroSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Patient-focused introduction and primary action.",
  schema: z.strictObject({
    eyebrow: z.string().max(80),
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
    "/eyebrow": { label: "Eyebrow", control: "text", order: 1, localization: "value" },
    "/title": {
      label: "Headline",
      control: "text",
      order: 2,
      localization: "value",
      aiHint: "Use a clear patient-focused headline",
    },
    "/body": { label: "Introduction", control: "textarea", order: 3, localization: "value" },
    "/ctaLabel": { label: "Action label", control: "text", order: 4, localization: "value" },
    "/ctaHref": { label: "Action destination", control: "url", order: 5 },
  },
});

const servicesSchema = contentSchema<JsonValue>({
  version: 1,
  description: "A bounded list of services.",
  schema: z.strictObject({
    title: z.string().min(1).max(100),
    items: z
      .array(
        z.strictObject({
          id: z.string().uuid(),
          title: z.string().min(1).max(100),
          body: z.string().min(1).max(500),
        }),
      )
      .max(12),
  }),
  fields: {
    "/title": { label: "Section title", control: "text", order: 1, localization: "value" },
    "/items": { label: "Services", control: "list", order: 2, localization: "value" },
  },
});

export const doctorSections: readonly SectionDefinition[] = [
  {
    id: doctorHeroId,
    title: "Hero",
    description: "Primary practice introduction.",
    category: "marketing",
    schema: heroSchema,
    defaults: {
      eyebrow: "Personal care",
      title: "Care centered around you",
      body: "Thoughtful medical care with time to listen.",
      ctaLabel: "Book an appointment",
      ctaHref: "/contact",
    },
    composedOf: [sharedButtonId],
    render: ({ value, context }) => (
      <section className="hero">
        <p>{field(value, "eyebrow")}</p>
        <h1>{field(value, "title")}</h1>
        <p>{field(value, "body")}</p>
        <a className="action action--primary" href={context.links.url(field(value, "ctaHref"))}>
          {field(value, "ctaLabel")}
        </a>
      </section>
    ),
  },
  {
    id: doctorServicesId,
    title: "Services",
    description: "Practice service overview.",
    category: "content",
    schema: servicesSchema,
    defaults: { title: "How I can help", items: [] },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section>
        <h2>{field(value, "title")}</h2>
      </section>
    ),
  },
];
