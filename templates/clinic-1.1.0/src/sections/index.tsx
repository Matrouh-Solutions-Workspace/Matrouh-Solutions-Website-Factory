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

const items = (value: Readonly<JsonValue>): readonly Record<string, JsonValue>[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const candidate = (value as Readonly<Record<string, JsonValue>>).items;
  return Array.isArray(candidate)
    ? candidate.filter(
        (item): item is Record<string, JsonValue> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
};

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
      <section className="hero hero--clinic">
        <div className="heroInner">
          <div className="heroCopy">
            <span className="sectionEyebrow">Connected healthcare</span>
            <h1>{field(value, "title")}</h1>
            <p className="heroLead">{field(value, "body")}</p>
            <div className="actionRow">
              <a
                className="action action--primary"
                href={context.links.url(field(value, "ctaHref"))}
              >
                {field(value, "ctaLabel")}
              </a>
              <a className="action action--secondary" href="tel:+201000000000">
                Call care team
              </a>
            </div>
          </div>
          <div aria-hidden className="clinicVisual">
            <span className="orbit orbit--one" />
            <span className="orbit orbit--two" />
            <strong>24</strong>
            <small>Specialties, one care network</small>
          </div>
        </div>
      </section>
    ),
  },
  {
    id: clinicLocationsId,
    title: "Locations",
    description: "Clinic locations and contact overview.",
    category: "content",
    schema: locationsSchema,
    defaults: {
      title: "Care close to home",
      body: "Choose a clinic with coordinated specialists, modern diagnostics, and a team that knows your story.",
      items: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          title: "Matrouh Central",
          body: "Primary care, pediatrics, diagnostics, and same-day appointments.",
        },
        {
          id: "20000000-0000-4000-8000-000000000002",
          title: "New Alamein",
          body: "Specialist consultations and advanced outpatient services.",
        },
        {
          id: "20000000-0000-4000-8000-000000000003",
          title: "North Coast",
          body: "Seasonal urgent care and family medicine near the coast.",
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section className="contentSection locationsSection">
        <div className="sectionHeading">
          <span className="sectionEyebrow">Our network</span>
          <h2>{field(value, "title")}</h2>
          <p>{field(value, "body")}</p>
        </div>
        <div className="cardGrid">
          {items(value).map((item, index) => (
            <article
              className="infoCard locationCard"
              key={typeof item.id === "string" ? item.id : index}
            >
              <span className="locationMarker" aria-hidden>
                +
              </span>
              <h3>{typeof item.title === "string" ? item.title : "Clinic location"}</h3>
              <p>{typeof item.body === "string" ? item.body : ""}</p>
              <a href="tel:+201000000000">
                Contact location <span aria-hidden>→</span>
              </a>
            </article>
          ))}
        </div>
      </section>
    ),
  },
];
