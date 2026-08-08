import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { sharedButtonId, sharedInfoCardId } from "@templates/shared";
import {
  doctorContactId,
  doctorHeroId,
  doctorServicesId,
  doctorTeamId,
  doctorTestimonialsId,
} from "../ids";

const field = (value: Readonly<JsonValue>, key: string): string =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as Readonly<Record<string, JsonValue>>)[key] === "string"
    ? ((value as Readonly<Record<string, JsonValue>>)[key] as string)
    : "";
const localeText = (locale: string, english: string, arabic: string) =>
  locale === "ar" ? arabic : english;

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

const numericField = (value: Readonly<JsonValue>, key: string): number => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const candidate = (value as Readonly<Record<string, JsonValue>>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
};

const mapsUrl = (latitude: number, longitude: number, address: string): string => {
  const query = latitude !== 0 || longitude !== 0 ? `${latitude},${longitude}` : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const mapsEmbedUrl = (latitude: number, longitude: number, address: string): string => {
  const query = latitude !== 0 || longitude !== 0 ? `${latitude},${longitude}` : address;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
};

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
    heroMediaId: z.string().uuid().nullable().default(null),
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
    "/heroMediaId": {
      label: "Doctor portrait",
      control: "media",
      order: 6,
      mediaKinds: ["image"],
      aiHint: "Recommended 1200 × 1500 px portrait image",
    },
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
          imageMediaId: z.string().uuid().nullable().default(null),
        }),
      )
      .max(12),
  }),
  fields: {
    "/title": { label: "Section title", control: "text", order: 1, localization: "value" },
    "/items": { label: "Services", control: "list", order: 2, localization: "value" },
  },
});

const teamSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Clinicians and care team profiles.",
  schema: z.strictObject({
    eyebrow: z.string().max(80),
    title: z.string().min(1).max(120),
    body: z.string().max(500),
    items: z
      .array(
        z.strictObject({
          id: z.string().uuid(),
          name: z.string().min(1).max(100),
          role: z.string().min(1).max(120),
          bio: z.string().max(400),
          imageMediaId: z.string().uuid().nullable().default(null),
        }),
      )
      .max(12),
  }),
  fields: {
    "/eyebrow": { label: "Eyebrow", control: "text", order: 1, localization: "value" },
    "/title": { label: "Section title", control: "text", order: 2, localization: "value" },
    "/body": { label: "Introduction", control: "textarea", order: 3, localization: "value" },
    "/items": { label: "Care team", control: "list", order: 4, localization: "value" },
  },
});

const testimonialsSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Patient feedback displayed with consent.",
  schema: z.strictObject({
    eyebrow: z.string().max(80),
    title: z.string().min(1).max(120),
    items: z
      .array(
        z.strictObject({
          id: z.string().uuid(),
          quote: z.string().min(1).max(600),
          name: z.string().min(1).max(100),
          detail: z.string().max(160),
        }),
      )
      .max(12),
  }),
  fields: {
    "/eyebrow": { label: "Eyebrow", control: "text", order: 1, localization: "value" },
    "/title": { label: "Section title", control: "text", order: 2, localization: "value" },
    "/items": { label: "Patient testimonials", control: "list", order: 3, localization: "value" },
  },
});

const contactSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Appointment and practice contact information.",
  schema: z.strictObject({
    eyebrow: z.string().max(80),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(600),
    phone: z.string().min(3).max(40),
    email: z.string().email().max(320),
    address: z.string().min(1).max(300),
    hours: z.string().min(1).max(240),
    latitude: z.number().min(-90).max(90).default(31.3543),
    longitude: z.number().min(-180).max(180).default(27.2373),
  }),
  fields: {
    "/eyebrow": { label: "Eyebrow", control: "text", order: 1 },
    "/title": { label: "Headline", control: "text", order: 2, localization: "value" },
    "/body": { label: "Introduction", control: "textarea", order: 3, localization: "value" },
    "/phone": { label: "Phone", control: "text", order: 4 },
    "/email": { label: "Email", control: "text", order: 5 },
    "/address": { label: "Address", control: "textarea", order: 6, localization: "value" },
    "/hours": { label: "Opening hours", control: "text", order: 7, localization: "value" },
    "/latitude": { label: "Map latitude", control: "number", order: 8 },
    "/longitude": { label: "Map longitude", control: "number", order: 9 },
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
      heroMediaId: null,
    },
    composedOf: [sharedButtonId],
    render: ({ value, context }) => (
      <section className="hero hero--doctor medivraHero">
        <div className="heroInner">
          <div className="heroCopy medivraHeroCopy">
            <span className="sectionEyebrow">{field(value, "eyebrow")}</span>
            <h1>{field(value, "title")}</h1>
            <p className="heroLead">{field(value, "body")}</p>
            <div className="actionRow">
              <a
                className="action action--primary"
                href={context.links.url(field(value, "ctaHref"))}
              >
                {field(value, "ctaLabel")}
              </a>
              <span className="trustNote">
                {localeText(
                  context.locale,
                  "Private · Personal · Unhurried",
                  "خصوصية · اهتمام · وقت كافٍ",
                )}
              </span>
            </div>
            <div className="heroProof medivraProof" aria-label="Practice highlights">
              <span>
                <strong>20+</strong>{" "}
                {localeText(context.locale, "years of care", "عامًا من الرعاية")}
              </span>
              <span>
                <strong>30 {localeText(context.locale, "min", "دقيقة")}</strong>{" "}
                {localeText(context.locale, "unrushed visits", "لكل زيارة")}
              </span>
              <span>
                <strong>1:1</strong> {localeText(context.locale, "continuity", "متابعة شخصية")}
              </span>
            </div>
          </div>
          {field(value, "heroMediaId") ? (
            <div className="heroVisual medivraVisual">
              <img alt="Doctor portrait" src={context.media.url(field(value, "heroMediaId"))} />
              <div className="medivraVisualBadge">
                <strong>4.9/5</strong>
                <span>Patient experience</span>
              </div>
            </div>
          ) : (
            <div aria-hidden className="heroVisual medivraVisual medivraVisual--placeholder">
              <span className="doctorPortraitMark">Care</span>
              <div className="doctorAvailability">
                <i /> Accepting appointments
              </div>
              <strong>
                Feel better,
                <br />
                live fully.
              </strong>
              <small>Thoughtful care, built around you</small>
              <div className="medivraVisualBadge">
                <strong>24 hr</strong>
                <span>Appointment response</span>
              </div>
            </div>
          )}
        </div>
      </section>
    ),
  },
  {
    id: doctorTeamId,
    title: "Care team",
    description: "Doctor and specialist profiles for a multi-provider practice.",
    category: "content",
    schema: teamSchema,
    defaults: {
      eyebrow: "Meet the team",
      title: "Specialists who make care feel personal",
      body: "A coordinated team with clear expertise and one shared standard of care.",
      items: [
        {
          id: "30000000-0000-4000-8000-000000000001",
          name: "Dr. Sarah Amin",
          role: "Family Medicine",
          bio: "Whole-person primary care, prevention, and long-term health planning.",
          imageMediaId: null,
        },
        {
          id: "30000000-0000-4000-8000-000000000002",
          name: "Dr. Omar Nabil",
          role: "Internal Medicine",
          bio: "Thoughtful diagnosis and coordinated care for complex adult health needs.",
          imageMediaId: null,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value, context }) => (
      <section className="contentSection doctorTeam">
        <div className="sectionHeading">
          <span className="sectionEyebrow">{field(value, "eyebrow")}</span>
          <h2>{field(value, "title")}</h2>
          <p>{field(value, "body")}</p>
        </div>
        <div className="cardGrid">
          {items(value).map((item, index) => (
            <article className="infoCard" key={typeof item.id === "string" ? item.id : index}>
              {typeof item.imageMediaId === "string" && item.imageMediaId ? (
                <img alt="" className="infoCardMedia" src={context.media.url(item.imageMediaId)} />
              ) : (
                <div aria-hidden className="infoCardMedia infoCardMedia--placeholder">
                  +
                </div>
              )}
              <span className="cardNumber">{String(index + 1).padStart(2, "0")}</span>
              <h3>{typeof item.name === "string" ? item.name : "Care team member"}</h3>
              <strong>{typeof item.role === "string" ? item.role : ""}</strong>
              <p>{typeof item.bio === "string" ? item.bio : ""}</p>
            </article>
          ))}
        </div>
      </section>
    ),
  },
  {
    id: doctorTestimonialsId,
    title: "Patient stories",
    description: "Trust-building patient feedback.",
    category: "content",
    schema: testimonialsSchema,
    defaults: {
      eyebrow: "Patient experience",
      title: "Trusted care, in patients' own words",
      items: [
        {
          id: "40000000-0000-4000-8000-000000000001",
          quote: "Every step was explained clearly. I left with a plan I could actually follow.",
          name: "M. Hassan",
          detail: "General medicine patient",
        },
        {
          id: "40000000-0000-4000-8000-000000000002",
          quote: "The team was organised, kind, and respectful of my time from start to finish.",
          name: "N. Adel",
          detail: "Preventive care patient",
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section className="contentSection doctorTestimonials">
        <div className="sectionHeading">
          <span className="sectionEyebrow">{field(value, "eyebrow")}</span>
          <h2>{field(value, "title")}</h2>
        </div>
        <div className="cardGrid">
          {items(value).map((item, index) => (
            <blockquote className="infoCard" key={typeof item.id === "string" ? item.id : index}>
              <p>“{typeof item.quote === "string" ? item.quote : ""}”</p>
              <footer>
                <strong>{typeof item.name === "string" ? item.name : ""}</strong>
                <small>{typeof item.detail === "string" ? item.detail : ""}</small>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    ),
  },
  {
    id: doctorServicesId,
    title: "Services",
    description: "Practice service overview.",
    category: "content",
    schema: servicesSchema,
    defaults: {
      title: "How I can help",
      items: [
        {
          id: "10000000-0000-4000-8000-000000000001",
          title: "General consultation",
          body: "A careful assessment, clear explanation, and a practical plan tailored to you.",
          imageMediaId: null,
        },
        {
          id: "10000000-0000-4000-8000-000000000002",
          title: "Preventive care",
          body: "Evidence-led screening and everyday guidance that helps you stay well.",
          imageMediaId: null,
        },
        {
          id: "10000000-0000-4000-8000-000000000003",
          title: "Follow-up care",
          body: "Continuity and thoughtful adjustments as your health needs change.",
          imageMediaId: null,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value, context }) => (
      <section className="contentSection doctorServices">
        <div className="sectionHeading">
          <span className="sectionEyebrow">
            {localeText(context.locale, "Services", "الخدمات")}
          </span>
          <h2>{field(value, "title")}</h2>
          <p>
            {localeText(
              context.locale,
              "Clear guidance and thoughtful care for the moments that matter.",
              "إرشاد واضح ورعاية متأنية في الأوقات التي تهمك.",
            )}
          </p>
        </div>
        <div className="cardGrid">
          {items(value).map((item, index) => (
            <article className="infoCard" key={typeof item.id === "string" ? item.id : index}>
              {typeof item.imageMediaId === "string" && item.imageMediaId ? (
                <img className="infoCardMedia" alt="" src={context.media.url(item.imageMediaId)} />
              ) : (
                <div aria-hidden className="infoCardMedia infoCardMedia--placeholder">
                  <span>+</span>
                </div>
              )}
              <span className="cardNumber">{String(index + 1).padStart(2, "0")}</span>
              <h3>{typeof item.title === "string" ? item.title : "Service"}</h3>
              <p>{typeof item.body === "string" ? item.body : ""}</p>
            </article>
          ))}
        </div>
      </section>
    ),
  },
  {
    id: doctorContactId,
    title: "Contact",
    description: "Practice contact and appointment details.",
    category: "contact",
    schema: contactSchema,
    defaults: {
      eyebrow: "Appointments",
      title: "Let’s plan your visit",
      body: "Contact the practice directly and our team will help you choose a suitable appointment.",
      phone: "+20 100 000 0000",
      email: "doctor@example.com",
      address: "Matrouh, Egypt",
      hours: "Saturday–Thursday · 9:00–18:00",
      latitude: 31.3543,
      longitude: 27.2373,
    },
    composedOf: [sharedInfoCardId, sharedButtonId],
    render: ({ value, context }) => (
      <section className="contactSection doctorContact">
        <div className="sectionHeading">
          <span className="sectionEyebrow">{field(value, "eyebrow")}</span>
          <h1>{field(value, "title")}</h1>
          <p>{field(value, "body")}</p>
        </div>
        <div className="contactLayout">
          <div className="contactGrid">
            <a className="contactCard" href={`tel:${field(value, "phone").replace(/\s/g, "")}`}>
              <small>Call the practice</small>
              <strong>{field(value, "phone")}</strong>
            </a>
            <a className="contactCard" href={`mailto:${field(value, "email")}`}>
              <small>Send an email</small>
              <strong>{field(value, "email")}</strong>
            </a>
            <div className="contactCard">
              <small>Visit us</small>
              <strong>{field(value, "address")}</strong>
            </div>
            <div className="contactCard">
              <small>Opening hours</small>
              <strong>{field(value, "hours")}</strong>
            </div>
          </div>
          <div className="doctorMapPanel">
            <iframe
              allowFullScreen
              loading="eager"
              referrerPolicy="strict-origin-when-cross-origin"
              src={context.links.url(
                mapsEmbedUrl(
                  numericField(value, "latitude"),
                  numericField(value, "longitude"),
                  field(value, "address"),
                ),
              )}
              title="Practice location map"
            />
            <a
              className="doctorMapCard"
              href={context.links.url(
                mapsUrl(
                  numericField(value, "latitude"),
                  numericField(value, "longitude"),
                  field(value, "address"),
                ),
              )}
              rel="noreferrer"
              target="_blank"
            >
              <span className="mapPin" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
                  <circle cx="12" cy="9" r="2.3" />
                </svg>
              </span>
              <span>
                <small>Find the practice</small>
                <strong>{field(value, "address")}</strong>
                <em>Open full map →</em>
              </span>
            </a>
          </div>
        </div>
      </section>
    ),
  },
];
