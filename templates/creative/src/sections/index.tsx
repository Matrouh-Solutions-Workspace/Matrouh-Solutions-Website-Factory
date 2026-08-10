import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { sharedButtonId, sharedInfoCardId } from "@templates/shared";
import {
  creativeApproachId,
  creativeContactId,
  creativeHeroId,
  creativeProofId,
  creativeQuoteId,
  creativeServicesId,
  creativeWorkId,
} from "../ids";

const defaultHeroImage = "/templates/creative/studio-folio-hero.webp";

const field = (value: Readonly<JsonValue>, key: string): string =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof (value as Readonly<Record<string, JsonValue>>)[key] === "string"
    ? ((value as Readonly<Record<string, JsonValue>>)[key] as string)
    : "";

const listItems = (value: Readonly<JsonValue>): readonly Record<string, JsonValue>[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const candidate = (value as Readonly<Record<string, JsonValue>>).items;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter(
    (item): item is Record<string, JsonValue> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
};

const itemText = (item: Readonly<Record<string, JsonValue>>, key: string): string =>
  typeof item[key] === "string" ? item[key] : "";

const localeText = (locale: string, english: string, arabic: string): string =>
  locale.toLowerCase().startsWith("ar") ? arabic : english;

const heroSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Editorial introduction with a customizable portrait and project action.",
  schema: z.strictObject({
    eyebrow: z.string().max(90),
    personName: z.string().min(1).max(120),
    title: z.string().min(1).max(150),
    body: z.string().min(1).max(700),
    ctaLabel: z.string().min(1).max(50),
    ctaHref: z
      .string()
      .min(1)
      .max(240)
      .regex(/^\/(?:[a-z0-9/_-]*)$/i),
    availability: z.string().min(1).max(120),
    imageAlt: z.string().min(1).max(180),
    heroMediaId: z.string().uuid().nullable().default(null),
  }),
  fields: {
    "/eyebrow": { label: "Role or specialty", control: "text", order: 1, localization: "value" },
    "/personName": {
      label: "Portfolio owner name",
      control: "text",
      order: 2,
      localization: "value",
    },
    "/title": {
      label: "Headline",
      control: "text",
      order: 3,
      localization: "value",
      aiHint: "A short, distinctive creative point of view",
    },
    "/body": { label: "Introduction", control: "textarea", order: 4, localization: "value" },
    "/ctaLabel": { label: "Action label", control: "text", order: 5, localization: "value" },
    "/ctaHref": { label: "Action destination", control: "url", order: 6 },
    "/availability": { label: "Availability", control: "text", order: 7, localization: "value" },
    "/imageAlt": {
      label: "Portrait description",
      control: "text",
      order: 8,
      localization: "value",
    },
    "/heroMediaId": {
      label: "Hero portrait",
      control: "media",
      order: 9,
      mediaKinds: ["image"],
      aiHint: "Recommended 1600 x 1200 px editorial portrait with room around the subject",
    },
  },
});

const listSchema = (description: string, maximum = 8) =>
  contentSchema<JsonValue>({
    version: 1,
    description,
    schema: z.strictObject({
      eyebrow: z.string().max(90),
      title: z.string().min(1).max(140),
      body: z.string().max(600),
      items: z
        .array(
          z.strictObject({
            id: z.string().uuid(),
            title: z.string().min(1).max(140),
            body: z.string().min(1).max(700),
            meta: z.string().max(140).default(""),
            imageMediaId: z.string().uuid().nullable().default(null),
          }),
        )
        .min(1)
        .max(maximum),
    }),
    fields: {
      "/eyebrow": { label: "Eyebrow", control: "text", order: 1, localization: "value" },
      "/title": { label: "Section title", control: "text", order: 2, localization: "value" },
      "/body": { label: "Introduction", control: "textarea", order: 3, localization: "value" },
      "/items": { label: "Items", control: "list", order: 4, localization: "value" },
    },
  });

const quoteSchema = contentSchema<JsonValue>({
  version: 1,
  description: "A featured client quotation and attribution.",
  schema: z.strictObject({
    quote: z.string().min(1).max(700),
    person: z.string().min(1).max(120),
    role: z.string().min(1).max(160),
  }),
  fields: {
    "/quote": { label: "Quote", control: "textarea", order: 1, localization: "value" },
    "/person": { label: "Client name", control: "text", order: 2, localization: "value" },
    "/role": { label: "Client role", control: "text", order: 3, localization: "value" },
  },
});

const contactSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Availability, contact details, and a direct project invitation.",
  schema: z.strictObject({
    eyebrow: z.string().max(90),
    title: z.string().min(1).max(150),
    body: z.string().min(1).max(700),
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

const proofSchema = listSchema("Compact proof points that establish scale and experience.", 4);
const workSchema = listSchema("Selected case studies with category and outcome.", 10);
const servicesSchema = listSchema("A focused creative service offering.", 8);
const approachSchema = listSchema("A transparent creative process from question to launch.", 6);

export const creativeSections: readonly SectionDefinition[] = [
  {
    id: creativeHeroId,
    title: "Editorial hero",
    description: "Creative positioning, portrait, availability, and primary action.",
    category: "marketing",
    schema: heroSchema,
    defaults: {
      eyebrow: "Independent creative director / Cairo + worldwide",
      personName: "Omar Nassar",
      title: "Ideas made unmistakable.",
      body: "I shape identities, digital experiences, and campaigns for ambitious teams that want clarity without losing character.",
      ctaLabel: "Explore selected work",
      ctaHref: "/work",
      availability: "Booking select projects for Q4",
      imageAlt: "Omar Nassar standing in a sunlit design studio",
      heroMediaId: null,
    },
    composedOf: [sharedButtonId],
    render: ({ value, context }) => {
      const mediaId = field(value, "heroMediaId");
      return (
        <section className="portfolioHero">
          <div className="portfolioHeroGrid">
            <div className="portfolioHeroCopy">
              <span className="portfolioKicker">{field(value, "eyebrow")}</span>
              <h1>{field(value, "title")}</h1>
              <p>{field(value, "body")}</p>
              <div className="portfolioHeroActions">
                <a
                  className="portfolioPrimaryAction"
                  href={context.links.url(field(value, "ctaHref"))}
                >
                  {field(value, "ctaLabel")} <span aria-hidden>↗</span>
                </a>
                <span className="portfolioAvailability">
                  <i aria-hidden /> {field(value, "availability")}
                </span>
              </div>
            </div>
            <figure className="portfolioPortrait">
              <span aria-hidden className="portfolioPortraitIndex">
                {localeText(context.locale, "01 / Portrait", "01 / صورة شخصية")}
              </span>
              <img
                alt={field(value, "imageAlt")}
                fetchPriority="high"
                height={1109}
                loading="eager"
                src={mediaId ? context.media.url(mediaId) : defaultHeroImage}
                width={1400}
              />
              <figcaption>
                <strong>{field(value, "personName")}</strong>
                <span>
                  {localeText(
                    context.locale,
                    "Strategy · Identity · Digital",
                    "استراتيجية · هوية · رقمي",
                  )}
                </span>
              </figcaption>
            </figure>
          </div>
          <div aria-hidden className="portfolioScrollCue">
            {localeText(context.locale, "Scroll to discover", "مرر لاكتشاف المزيد")} <span>↓</span>
          </div>
        </section>
      );
    },
  },
  {
    id: creativeProofId,
    title: "Proof strip",
    description: "Experience and outcome highlights.",
    category: "content",
    schema: proofSchema,
    defaults: {
      eyebrow: "In numbers",
      title: "Small studio. Serious range.",
      body: "Senior thinking stays close to the work from first question to final release.",
      items: [
        {
          id: "41000000-0000-4000-8000-000000000001",
          title: "42",
          body: "brands launched across culture, technology, and hospitality",
          meta: "Projects",
          imageMediaId: null,
        },
        {
          id: "41000000-0000-4000-8000-000000000002",
          title: "11 yrs",
          body: "turning complex offers into clear, magnetic stories",
          meta: "Experience",
          imageMediaId: null,
        },
        {
          id: "41000000-0000-4000-8000-000000000003",
          title: "8",
          body: "countries connected through long-term creative partnerships",
          meta: "Markets",
          imageMediaId: null,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section className="portfolioProof">
        <header>
          <span>{field(value, "eyebrow")}</span>
          <h2>{field(value, "title")}</h2>
          <p>{field(value, "body")}</p>
        </header>
        <div className="portfolioProofGrid">
          {listItems(value).map((item, index) => (
            <article key={itemText(item, "id") || index}>
              <small>{itemText(item, "meta")}</small>
              <strong>{itemText(item, "title")}</strong>
              <p>{itemText(item, "body")}</p>
            </article>
          ))}
        </div>
      </section>
    ),
  },
  {
    id: creativeWorkId,
    title: "Selected work",
    description: "Visual case studies with concise outcomes.",
    category: "portfolio",
    schema: workSchema,
    defaults: {
      eyebrow: "Selected work / 2023-2026",
      title: "A portfolio built around change, not decoration.",
      body: "Identity systems and digital experiences designed to make the next move feel inevitable.",
      items: [
        {
          id: "42000000-0000-4000-8000-000000000001",
          title: "Northline House",
          body: "A quiet-luxury identity and booking journey that turned a coastal retreat into a year-round destination.",
          meta: "Hospitality · Brand + Digital · +38% direct bookings",
          imageMediaId: null,
        },
        {
          id: "42000000-0000-4000-8000-000000000002",
          title: "Common Ground",
          body: "A flexible cultural platform that gives artists, talks, and late-night programming one recognizable voice.",
          meta: "Culture · Strategy + Campaign · 4-city launch",
          imageMediaId: null,
        },
        {
          id: "42000000-0000-4000-8000-000000000003",
          title: "Field Notes AI",
          body: "Complex research software reframed as an approachable daily instrument for modern product teams.",
          meta: "Technology · Product story + Web · Series A",
          imageMediaId: null,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value, context }) => (
      <section className="portfolioWork">
        <header className="portfolioSectionIntro">
          <span>{field(value, "eyebrow")}</span>
          <h1>{field(value, "title")}</h1>
          <p>{field(value, "body")}</p>
        </header>
        <div className="portfolioWorkGrid">
          {listItems(value).map((item, index) => {
            const imageMediaId = itemText(item, "imageMediaId");
            return (
              <article
                className={`portfolioProject portfolioProject--${(index % 3) + 1}`}
                key={itemText(item, "id") || index}
              >
                {imageMediaId ? (
                  <img
                    alt=""
                    height={900}
                    loading="lazy"
                    src={context.media.url(imageMediaId)}
                    width={1200}
                  />
                ) : (
                  <div aria-hidden className="portfolioProjectArt">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i />
                  </div>
                )}
                <div className="portfolioProjectCopy">
                  <small>{itemText(item, "meta")}</small>
                  <h2>{itemText(item, "title")}</h2>
                  <p>{itemText(item, "body")}</p>
                  <span aria-hidden className="portfolioProjectArrow">
                    ↗
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    ),
  },
  {
    id: creativeServicesId,
    title: "Services",
    description: "Focused offers presented as an editorial capability list.",
    category: "content",
    schema: servicesSchema,
    defaults: {
      eyebrow: "Ways to work together",
      title: "From first signal to a system people remember.",
      body: "Each engagement is shaped around the real decision ahead, then scaled with the right collaborators.",
      items: [
        {
          id: "43000000-0000-4000-8000-000000000001",
          title: "Brand direction",
          body: "Positioning, narrative, naming, identity systems, and practical guidance that teams can actually use.",
          meta: "01 · Define",
          imageMediaId: null,
        },
        {
          id: "43000000-0000-4000-8000-000000000002",
          title: "Digital experiences",
          body: "Editorial websites and product stories with strong hierarchy, intuitive journeys, and expressive detail.",
          meta: "02 · Design",
          imageMediaId: null,
        },
        {
          id: "43000000-0000-4000-8000-000000000003",
          title: "Campaign systems",
          body: "Launch concepts and modular content frameworks that stay coherent across channels and moments.",
          meta: "03 · Move",
          imageMediaId: null,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section className="portfolioServices">
        <header className="portfolioSectionIntro portfolioSectionIntro--compact">
          <span>{field(value, "eyebrow")}</span>
          <h2>{field(value, "title")}</h2>
          <p>{field(value, "body")}</p>
        </header>
        <div className="portfolioServiceList">
          {listItems(value).map((item, index) => (
            <article key={itemText(item, "id") || index}>
              <small>{itemText(item, "meta")}</small>
              <h3>{itemText(item, "title")}</h3>
              <p>{itemText(item, "body")}</p>
              <span aria-hidden>↗</span>
            </article>
          ))}
        </div>
      </section>
    ),
  },
  {
    id: creativeApproachId,
    title: "Creative approach",
    description: "A clear, collaborative process.",
    category: "content",
    schema: approachSchema,
    defaults: {
      eyebrow: "The approach",
      title: "Enough structure to move. Enough room to surprise.",
      body: "The process keeps decisions visible and energy focused on what will make the work distinct.",
      items: [
        {
          id: "44000000-0000-4000-8000-000000000001",
          title: "Find the tension",
          body: "Listen closely, map the context, and identify the sharpest opportunity the work can own.",
          meta: "Discover",
          imageMediaId: null,
        },
        {
          id: "44000000-0000-4000-8000-000000000002",
          title: "Build the language",
          body: "Turn strategy into a visual and verbal world, then test it against real moments and audiences.",
          meta: "Create",
          imageMediaId: null,
        },
        {
          id: "44000000-0000-4000-8000-000000000003",
          title: "Make it travel",
          body: "Shape the system, document the logic, and equip the team to keep the idea coherent as it grows.",
          meta: "Activate",
          imageMediaId: null,
        },
      ],
    },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section className="portfolioApproach">
        <div className="portfolioApproachLead">
          <span>{field(value, "eyebrow")}</span>
          <h2>{field(value, "title")}</h2>
          <p>{field(value, "body")}</p>
        </div>
        <ol>
          {listItems(value).map((item, index) => (
            <li key={itemText(item, "id") || index}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>{itemText(item, "meta")}</small>
              <h3>{itemText(item, "title")}</h3>
              <p>{itemText(item, "body")}</p>
            </li>
          ))}
        </ol>
      </section>
    ),
  },
  {
    id: creativeQuoteId,
    title: "Client quote",
    description: "A high-impact endorsement.",
    category: "testimonials",
    schema: quoteSchema,
    defaults: {
      quote:
        "The work did more than make us look established. It gave the whole team a sharper way to explain what makes us matter.",
      person: "Maya El-Sayed",
      role: "Co-founder, Northline House",
    },
    composedOf: [sharedInfoCardId],
    render: ({ value }) => (
      <section className="portfolioQuote">
        <span aria-hidden>“</span>
        <blockquote>{field(value, "quote")}</blockquote>
        <footer>
          <strong>{field(value, "person")}</strong>
          <small>{field(value, "role")}</small>
        </footer>
      </section>
    ),
  },
  {
    id: creativeContactId,
    title: "Contact",
    description: "Direct project enquiry and studio availability.",
    category: "contact",
    schema: contactSchema,
    defaults: {
      eyebrow: "Have a project in mind?",
      title: "Let’s make the next move feel obvious.",
      body: "Share the ambition, the tension, and where things stand. You will receive a considered response on fit, timing, and a useful first step.",
      email: "hello@studio.example",
      phone: "+20 100 000 0000",
      location: "Cairo, Egypt / Working worldwide",
      availability: "Currently booking select Q4 engagements",
    },
    composedOf: [sharedInfoCardId, sharedButtonId],
    render: ({ value, context }) => (
      <section className="portfolioContact">
        <span className="portfolioContactEyebrow">{field(value, "eyebrow")}</span>
        <h1>{field(value, "title")}</h1>
        <p>{field(value, "body")}</p>
        <a href={`mailto:${field(value, "email")}`}>
          {field(value, "email")} <span aria-hidden>↗</span>
        </a>
        <div>
          <span>
            <small>{localeText(context.locale, "Call", "اتصل")}</small>
            {field(value, "phone")}
          </span>
          <span>
            <small>{localeText(context.locale, "Based", "الموقع")}</small>
            {field(value, "location")}
          </span>
          <span>
            <small>{localeText(context.locale, "Availability", "التوفر")}</small>
            {field(value, "availability")}
          </span>
        </div>
      </section>
    ),
  },
];
