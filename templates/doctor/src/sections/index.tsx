import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { sharedButtonId, sharedInfoCardId } from "@templates/shared";
import { doctorContactId, doctorHeroId, doctorServicesId } from "../ids";

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
  }),
  fields: {
    "/eyebrow": { label: "Eyebrow", control: "text", order: 1 },
    "/title": { label: "Headline", control: "text", order: 2, localization: "value" },
    "/body": { label: "Introduction", control: "textarea", order: 3, localization: "value" },
    "/phone": { label: "Phone", control: "text", order: 4 },
    "/email": { label: "Email", control: "text", order: 5 },
    "/address": { label: "Address", control: "textarea", order: 6, localization: "value" },
    "/hours": { label: "Opening hours", control: "text", order: 7, localization: "value" },
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
      <section className="hero hero--doctor">
        <div className="heroInner">
          <div className="heroCopy">
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
              <span className="trustNote">Private · Personal · Unhurried</span>
            </div>
          </div>
          <div aria-hidden className="heroVisual">
            <span>Care</span>
            <strong>01</strong>
            <small>One patient at a time</small>
          </div>
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
        },
        {
          id: "10000000-0000-4000-8000-000000000002",
          title: "Preventive care",
          body: "Evidence-led screening and everyday guidance that helps you stay well.",
        },
        {
          id: "10000000-0000-4000-8000-000000000003",
          title: "Follow-up care",
          body: "Continuity and thoughtful adjustments as your health needs change.",
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section className="contentSection">
        <div className="sectionHeading">
          <span className="sectionEyebrow">Services</span>
          <h2>{field(value, "title")}</h2>
          <p>Clear guidance and thoughtful care for the moments that matter.</p>
        </div>
        <div className="cardGrid">
          {items(value).map((item, index) => (
            <article className="infoCard" key={typeof item.id === "string" ? item.id : index}>
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
    },
    composedOf: [sharedInfoCardId, sharedButtonId],
    render: ({ value }) => (
      <section className="contactSection">
        <div className="sectionHeading">
          <span className="sectionEyebrow">{field(value, "eyebrow")}</span>
          <h1>{field(value, "title")}</h1>
          <p>{field(value, "body")}</p>
        </div>
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
      </section>
    ),
  },
];
