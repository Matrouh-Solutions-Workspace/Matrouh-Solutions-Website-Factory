import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { sharedButtonId, sharedInfoCardId } from "@templates/shared";
import { engineerContactId, engineerExpertiseId, engineerHeroId, engineerProjectsId } from "../ids";

const field = (value: Readonly<JsonValue>, key: string): string =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof (value as Readonly<Record<string, JsonValue>>)[key] === "string"
    ? ((value as Readonly<Record<string, JsonValue>>)[key] as string)
    : "";
const localeText = (locale: string, english: string, arabic: string) =>
  locale === "ar" ? arabic : english;
const items = (value: Readonly<JsonValue>): readonly Record<string, JsonValue>[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const candidate = (value as Readonly<Record<string, JsonValue>>).items;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter(
    (item): item is Record<string, JsonValue> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
};

const heroSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Engineer positioning and primary project enquiry action.",
  schema: z.strictObject({
    eyebrow: z.string().max(80),
    title: z.string().min(1).max(140),
    body: z.string().min(1).max(700),
    ctaLabel: z.string().min(1).max(50),
    ctaHref: z
      .string()
      .min(1)
      .max(240)
      .regex(/^\/(?:[a-z0-9/_-]*)$/i),
    credential: z.string().min(1).max(100),
    heroMediaId: z.string().uuid().nullable().default(null),
  }),
  fields: {
    "/eyebrow": { label: "Eyebrow", control: "text", order: 1, localization: "value" },
    "/title": {
      label: "Headline",
      control: "text",
      order: 2,
      localization: "value",
      aiHint: "State the engineering specialty and business outcome",
    },
    "/body": { label: "Introduction", control: "textarea", order: 3, localization: "value" },
    "/ctaLabel": { label: "Action label", control: "text", order: 4, localization: "value" },
    "/ctaHref": { label: "Action destination", control: "url", order: 5 },
    "/credential": { label: "Credential", control: "text", order: 6, localization: "value" },
    "/heroMediaId": {
      label: "Hero project image",
      control: "media",
      order: 7,
      mediaKinds: ["image"],
      aiHint: "Recommended 1920 × 1080 px landscape image",
    },
  },
});

const listSchema = (description: string) =>
  contentSchema<JsonValue>({
    version: 1,
    description,
    schema: z.strictObject({
      eyebrow: z.string().max(80),
      title: z.string().min(1).max(120),
      body: z.string().max(500),
      items: z
        .array(
          z.strictObject({
            id: z.string().uuid(),
            title: z.string().min(1).max(120),
            body: z.string().min(1).max(600),
            meta: z.string().max(120).default(""),
            imageMediaId: z.string().uuid().nullable().default(null),
          }),
        )
        .min(1)
        .max(12),
    }),
    fields: {
      "/eyebrow": { label: "Eyebrow", control: "text", order: 1, localization: "value" },
      "/title": { label: "Section title", control: "text", order: 2, localization: "value" },
      "/body": { label: "Introduction", control: "textarea", order: 3, localization: "value" },
      "/items": { label: "Items", control: "list", order: 4, localization: "value" },
    },
  });

const contactSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Project enquiry and contact information.",
  schema: z.strictObject({
    eyebrow: z.string().max(80),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(600),
    email: z.string().email().max(320),
    phone: z.string().min(3).max(40),
    location: z.string().min(1).max(200),
    availability: z.string().min(1).max(180),
  }),
  fields: {
    "/eyebrow": { label: "Eyebrow", control: "text", order: 1, localization: "value" },
    "/title": { label: "Headline", control: "text", order: 2, localization: "value" },
    "/body": { label: "Introduction", control: "textarea", order: 3, localization: "value" },
    "/email": { label: "Email", control: "text", order: 4 },
    "/phone": { label: "Phone", control: "text", order: 5 },
    "/location": { label: "Location", control: "text", order: 6, localization: "value" },
    "/availability": { label: "Availability", control: "text", order: 7, localization: "value" },
  },
});

const expertiseSchema = listSchema("A bounded list of engineering capabilities.");
const projectsSchema = listSchema("Selected projects with concise measurable outcomes.");

export const engineerSections: readonly SectionDefinition[] = [
  {
    id: engineerHeroId,
    title: "Hero",
    description: "Professional positioning and enquiry action.",
    category: "marketing",
    schema: heroSchema,
    defaults: {
      eyebrow: "Civil & structural engineering",
      title: "Engineering clarity into every decision",
      body: "Independent technical leadership for resilient buildings, efficient delivery, and confident project teams.",
      ctaLabel: "Discuss a project",
      ctaHref: "/contact",
      credential: "MSc · Chartered Engineer · 12 years experience",
      heroMediaId: null,
    },
    composedOf: [sharedButtonId],
    render: ({ value, context }) => (
      <section className="hero hero--engineer">
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
              <span className="trustNote">{field(value, "credential")}</span>
            </div>
          </div>
          {field(value, "heroMediaId") ? (
            <div className="heroVisual">
              <img
                alt="Featured engineering project"
                src={context.media.url(field(value, "heroMediaId"))}
              />
            </div>
          ) : (
            <div aria-hidden className="heroVisual">
              <span className="doctorPortraitMark">01</span>
              <strong>
                Plan.
                <br />
                Prove.
                <br />
                Build.
              </strong>
              <small>{localeText(context.locale, "Engineering with intent", "هندسة هادفة")}</small>
            </div>
          )}
        </div>
      </section>
    ),
  },
  {
    id: engineerExpertiseId,
    title: "Expertise",
    description: "Engineering service overview.",
    category: "content",
    schema: expertiseSchema,
    defaults: {
      eyebrow: "Expertise",
      title: "Technical depth, practical delivery",
      body: "Support from early feasibility through construction.",
      items: [
        {
          id: "30000000-0000-4000-8000-000000000001",
          title: "Structural design",
          body: "Safe, efficient structural systems coordinated around architectural intent.",
          meta: "Buildings",
          imageMediaId: null,
        },
        {
          id: "30000000-0000-4000-8000-000000000002",
          title: "Technical review",
          body: "Independent design checks, risk reviews, and clear recommendations.",
          meta: "Assurance",
          imageMediaId: null,
        },
        {
          id: "30000000-0000-4000-8000-000000000003",
          title: "Site engineering",
          body: "Responsive construction support that resolves issues before they become delays.",
          meta: "Delivery",
          imageMediaId: null,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: listSection("Capabilities"),
  },
  {
    id: engineerProjectsId,
    title: "Projects",
    description: "Selected engineering case studies.",
    category: "portfolio",
    schema: projectsSchema,
    defaults: {
      eyebrow: "Selected work",
      title: "Built results",
      body: "Representative commissions across commercial, residential, and infrastructure projects.",
      items: [
        {
          id: "31000000-0000-4000-8000-000000000001",
          title: "Coastal mixed-use development",
          body: "Optimized the structural grid and foundation strategy for demanding marine conditions.",
          meta: "18% material reduction",
          imageMediaId: null,
        },
        {
          id: "31000000-0000-4000-8000-000000000002",
          title: "Hospital expansion",
          body: "Phased engineering maintained live clinical operations throughout construction.",
          meta: "Zero service interruption",
          imageMediaId: null,
        },
        {
          id: "31000000-0000-4000-8000-000000000003",
          title: "Industrial retrofit",
          body: "Verified existing capacity and designed targeted strengthening for new production loads.",
          meta: "6-week delivery",
          imageMediaId: null,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: listSection("Case study"),
  },
  {
    id: engineerContactId,
    title: "Contact",
    description: "Project enquiry details.",
    category: "contact",
    schema: contactSchema,
    defaults: {
      eyebrow: "Start a conversation",
      title: "Bring the technical challenge",
      body: "Share the project stage, location, and decisions ahead. You will receive a clear response on fit and next steps.",
      email: "studio@example.com",
      phone: "+20 100 000 0000",
      location: "Matrouh, Egypt",
      availability: "New commissions from September",
    },
    composedOf: [sharedInfoCardId, sharedButtonId],
    render: ({ value, context }) => (
      <section className="contactSection engineerContact">
        <div className="sectionHeading">
          <span className="sectionEyebrow">{field(value, "eyebrow")}</span>
          <h1>{field(value, "title")}</h1>
          <p>{field(value, "body")}</p>
        </div>
        <div className="contactGrid">
          <a className="contactCard" href={`mailto:${field(value, "email")}`}>
            <small>{localeText(context.locale, "Email", "البريد الإلكتروني")}</small>
            <strong>{field(value, "email")}</strong>
          </a>
          <a className="contactCard" href={`tel:${field(value, "phone").replace(/\s/g, "")}`}>
            <small>{localeText(context.locale, "Call", "اتصل")}</small>
            <strong>{field(value, "phone")}</strong>
          </a>
          <div className="contactCard">
            <small>{localeText(context.locale, "Based in", "الموقع")}</small>
            <strong>{field(value, "location")}</strong>
          </div>
          <div className="contactCard">
            <small>{localeText(context.locale, "Availability", "التوفر")}</small>
            <strong>{field(value, "availability")}</strong>
          </div>
        </div>
      </section>
    ),
  },
];

function listSection(fallback: string): SectionDefinition["render"] {
  return ({ value, context }) => (
    <section
      className={`contentSection ${fallback === "Capabilities" ? "engineerExpertise" : "engineerProjects"}`}
    >
      <div className="sectionHeading">
        <span className="sectionEyebrow">{field(value, "eyebrow")}</span>
        <h2>{field(value, "title")}</h2>
        <p>{field(value, "body")}</p>
      </div>
      <div className="cardGrid">
        {items(value).map((item, index) => (
          <article className="infoCard" key={typeof item.id === "string" ? item.id : index}>
            {typeof item.imageMediaId === "string" && item.imageMediaId ? (
              <img className="infoCardMedia" alt="" src={context.media.url(item.imageMediaId)} />
            ) : (
              <div aria-hidden className="infoCardMedia infoCardMedia--placeholder">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
            )}
            <span className="cardNumber">{String(index + 1).padStart(2, "0")}</span>
            <small>{typeof item.meta === "string" ? item.meta : fallback}</small>
            <h3>{typeof item.title === "string" ? item.title : fallback}</h3>
            <p>{typeof item.body === "string" ? item.body : ""}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
