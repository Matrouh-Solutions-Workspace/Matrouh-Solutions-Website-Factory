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

const stringItem = (item: Readonly<Record<string, JsonValue>>, key: string): string =>
  typeof item[key] === "string" ? item[key] : "";

const numberItem = (item: Readonly<Record<string, JsonValue>>, key: string): number =>
  typeof item[key] === "number" && Number.isFinite(item[key]) ? item[key] : 0;

const locationControlId = (item: Readonly<Record<string, JsonValue>>, index: number): string =>
  `clinic-location-${typeof item.id === "string" ? item.id : index}`;

const mapsUrl = (item: Readonly<Record<string, JsonValue>>): string => {
  const latitude = numberItem(item, "latitude");
  const longitude = numberItem(item, "longitude");
  const query =
    latitude !== 0 || longitude !== 0
      ? `${latitude},${longitude}`
      : stringItem(item, "address") || stringItem(item, "title");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const mapsEmbedUrl = (item: Readonly<Record<string, JsonValue>>): string => {
  const latitude = numberItem(item, "latitude");
  const longitude = numberItem(item, "longitude");
  const query =
    latitude !== 0 || longitude !== 0
      ? `${latitude},${longitude}`
      : stringItem(item, "address") || stringItem(item, "title");
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
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
          address: z.string().max(300).default("Matrouh, Egypt"),
          phone: z.string().max(40).default("+20 100 000 0000"),
          hours: z.string().max(160).default("Saturday–Thursday · 9:00–18:00"),
          latitude: z.number().min(-90).max(90).default(31.3543),
          longitude: z.number().min(-180).max(180).default(27.2373),
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
            <div className="clinicProof">
              <span>
                <strong>24</strong> specialties
              </span>
              <span>
                <strong>3</strong> locations
              </span>
              <span>
                <strong>7 days</strong> connected care
              </span>
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
          address: "Marsa Matrouh, Matrouh, Egypt",
          phone: "+20 100 000 0000",
          hours: "Saturday–Thursday · 9:00–18:00",
          latitude: 31.3543,
          longitude: 27.2373,
        },
        {
          id: "20000000-0000-4000-8000-000000000002",
          title: "New Alamein",
          body: "Specialist consultations and advanced outpatient services.",
          address: "New Alamein, Matrouh, Egypt",
          phone: "+20 100 000 0001",
          hours: "Daily · 10:00–20:00",
          latitude: 30.8301,
          longitude: 28.955,
        },
        {
          id: "20000000-0000-4000-8000-000000000003",
          title: "North Coast",
          body: "Seasonal urgent care and family medicine near the coast.",
          address: "North Coast, Matrouh, Egypt",
          phone: "+20 100 000 0002",
          hours: "Daily · 8:00–22:00",
          latitude: 30.9252,
          longitude: 28.6482,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value, context }) => (
      <section className="contentSection locationsSection clinicLocations">
        <div className="sectionHeading">
          <span className="sectionEyebrow">Our network</span>
          <h2>{field(value, "title")}</h2>
          <p>{field(value, "body")}</p>
        </div>
        <div className="locationPortfolio">
          {items(value).map((item, index) => (
            <div
              className="locationPortfolioItem"
              key={typeof item.id === "string" ? item.id : index}
            >
              <input
                aria-label={`Show ${stringItem(item, "title") || `location ${index + 1}`} on map`}
                className="locationToggle"
                defaultChecked={index === 0}
                id={locationControlId(item, index)}
                name="clinic-location-map"
                type="radio"
              />
              <label className="locationChoice" htmlFor={locationControlId(item, index)}>
                <span className="locationChoiceTop">
                  <span className="locationMarker" aria-hidden>
                    <svg viewBox="0 0 24 24">
                      <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
                      <circle cx="12" cy="9" r="2.3" />
                    </svg>
                  </span>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </span>
                <span className="locationChoiceCopy">
                  <strong>{stringItem(item, "title") || "Clinic location"}</strong>
                  <span>{stringItem(item, "body")}</span>
                </span>
                <span className="locationChoiceAddress">{stringItem(item, "address")}</span>
              </label>
              <div className="locationMapFrame">
                <iframe
                  allowFullScreen
                  loading={index === 0 ? "eager" : "lazy"}
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={context.links.url(mapsEmbedUrl(item))}
                  title={`${stringItem(item, "title") || "Clinic"} map`}
                />
                <div className="locationMapDetails">
                  <div>
                    <span className="sectionEyebrow">Selected clinic</span>
                    <strong>{stringItem(item, "title")}</strong>
                    <small>{stringItem(item, "address")}</small>
                  </div>
                  <dl>
                    <div>
                      <dt>Hours</dt>
                      <dd>{stringItem(item, "hours")}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{stringItem(item, "phone")}</dd>
                    </div>
                  </dl>
                  <div className="locationActions">
                    <a href={`tel:${stringItem(item, "phone").replace(/\s/g, "")}`}>Call clinic</a>
                    <a href={context.links.url(mapsUrl(item))} rel="noreferrer" target="_blank">
                      Open full map <span aria-hidden>→</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
  },
];
