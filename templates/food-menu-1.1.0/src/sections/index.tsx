import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { foodMenuCatalogId, foodMenuHeroId, foodMenuImportId, foodMenuVisitId } from "../ids";

const defaultHeroImage = "/templates/food-menu/food-cafe-hero.jpg";

type RecordValue = Readonly<Record<string, JsonValue>>;

const record = (value: Readonly<JsonValue>): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};
const text = (value: RecordValue, key: string): string =>
  typeof value[key] === "string" ? value[key] : "";
const number = (value: RecordValue, key: string): number =>
  typeof value[key] === "number" ? value[key] : 0;
const bool = (value: RecordValue, key: string): boolean => value[key] !== false;
const list = (value: RecordValue, key: string): readonly RecordValue[] => {
  const candidate = value[key];
  return Array.isArray(candidate)
    ? candidate.filter(
        (item): item is Record<string, JsonValue> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
};
const localized = (locale: string, english: string, arabic: string): string =>
  locale.toLowerCase().startsWith("ar") ? arabic : english;

const heroSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Restaurant welcome, service promise, and replaceable food photography.",
  schema: z.strictObject({
    eyebrow: z.string().max(90),
    headline: z.string().min(1).max(150),
    introduction: z.string().min(1).max(700),
    serviceNote: z.string().max(160),
    openStatus: z.string().max(100),
    heroImageAlt: z.string().max(180),
    heroMediaId: z.string().uuid().nullable().default(null),
  }),
  fields: {
    "/eyebrow": { label: "Menu eyebrow", control: "text", order: 1, localization: "value" },
    "/headline": { label: "Welcome headline", control: "text", order: 2, localization: "value" },
    "/introduction": {
      label: "Welcome message",
      control: "textarea",
      order: 3,
      localization: "value",
    },
    "/serviceNote": { label: "Service note", control: "text", order: 4, localization: "value" },
    "/openStatus": { label: "Opening status", control: "text", order: 5, localization: "value" },
    "/heroImageAlt": {
      label: "Hero image description",
      control: "text",
      order: 6,
      localization: "value",
    },
    "/heroMediaId": {
      label: "Hero food photograph",
      control: "media",
      order: 7,
      mediaKinds: ["image"],
      aiHint: "Recommended 1600 × 1100 px landscape food photography",
    },
  },
});

const sizeSchema = z.strictObject({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  price: z.number().min(0).max(1_000_000),
});

const itemSchema = z.strictObject({
  id: z.string().uuid(),
  name: z.string().min(1).max(140),
  description: z.string().max(700),
  pricingMode: z.enum(["fixed", "variants"]),
  price: z.number().min(0).max(1_000_000),
  imageMediaId: z.string().uuid().nullable().default(null),
  badge: z.string().max(60),
  additionalInfo: z.string().max(260),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  sizes: z.array(sizeSchema).min(1).max(10),
});

const catalogSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Hierarchical menu categories, items, images, availability, and size prices.",
  schema: z.strictObject({
    eyebrow: z.string().max(90),
    title: z.string().min(1).max(140),
    introduction: z.string().max(500),
    currency: z.string().min(1).max(12),
    currencyBeforePrice: z.boolean().default(false),
    categories: z
      .array(
        z.strictObject({
          id: z.string().uuid(),
          name: z.string().min(1).max(120),
          description: z.string().max(320),
          items: z.array(itemSchema).min(1).max(80),
        }),
      )
      .min(1)
      .max(24),
  }),
  fields: {
    "/eyebrow": { label: "Section eyebrow", control: "text", order: 1, localization: "value" },
    "/title": { label: "Menu heading", control: "text", order: 2, localization: "value" },
    "/introduction": {
      label: "Menu introduction",
      control: "textarea",
      order: 3,
      localization: "value",
    },
    "/currency": { label: "Currency", control: "text", order: 4 },
    "/currencyBeforePrice": { label: "Show currency before price", control: "boolean", order: 5 },
    "/categories": {
      label: "Menu categories",
      description: "Add and reorder categories, dishes, drinks, and price variants.",
      control: "list",
      order: 6,
      localization: "document",
    },
  },
});

const visitSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Opening hours, address, ordering details, and dietary disclosure.",
  schema: z.strictObject({
    eyebrow: z.string().max(90),
    title: z.string().min(1).max(140),
    body: z.string().max(600),
    hours: z.string().max(240),
    address: z.string().max(240),
    phone: z.string().max(40),
    actionLabel: z.string().max(70),
    actionHref: z
      .string()
      .max(240)
      .regex(/^(?:\/(?:[a-z0-9/_-]*)|tel:\+?[0-9 -]+)$/i),
    dietaryNote: z.string().max(400),
  }),
  fields: {
    "/eyebrow": { label: "Details eyebrow", control: "text", order: 1, localization: "value" },
    "/title": { label: "Details heading", control: "text", order: 2, localization: "value" },
    "/body": {
      label: "Details introduction",
      control: "textarea",
      order: 3,
      localization: "value",
    },
    "/hours": { label: "Opening hours", control: "textarea", order: 4, localization: "value" },
    "/address": { label: "Address", control: "textarea", order: 5, localization: "value" },
    "/phone": { label: "Phone", control: "text", order: 6 },
    "/actionLabel": { label: "Action label", control: "text", order: 7, localization: "value" },
    "/actionHref": { label: "Action destination", control: "url", order: 8 },
    "/dietaryNote": {
      label: "Dietary and allergen note",
      control: "textarea",
      order: 9,
      localization: "value",
    },
  },
});

const importDraftSchema = z.strictObject({
  sourcePdfMediaId: z.string().uuid().nullable().default(null),
  sourceFilename: z.string().max(255).default(""),
  locale: z.enum(["ar", "en"]).default("en"),
  status: z.enum(["not_started", "review_required", "confirmed"]).default("not_started"),
  extractedText: z.string().max(40_000).default(""),
  reviewNotes: z.string().max(4_000).default(""),
});

const importSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Optional PDF import source with extracted text and an explicit review gate.",
  schema: z.strictObject({ importDraft: importDraftSchema }),
  fields: {
    "/importDraft": {
      label: "Import menu from PDF",
      description:
        "Upload, extract, review, and confirm before transferring content into categories.",
      control: "document-import",
      order: 1,
    },
  },
});

export const foodMenuSections: readonly SectionDefinition[] = [
  {
    id: foodMenuHeroId,
    title: "Business profile",
    description: "Restaurant name, welcome message, service status, and food photography.",
    category: "menu-identity",
    editor: { group: "Branding", icon: "store" },
    schema: heroSchema,
    defaults: {
      eyebrow: "All-day kitchen · Freshly made",
      headline: "Good food, made for sharing.",
      introduction:
        "Season-led plates, proper coffee, and generous favorites served with an easy neighborhood welcome.",
      serviceNote: "Dine in · Takeaway · Delivery",
      openStatus: "Open today until 11 PM",
      heroImageAlt: "A café table with pizza, burger, coffee, juice, and fresh pastry",
      heroMediaId: null,
    },
    render: ({ value, context }) => {
      const content = record(value);
      const mediaId = text(content, "heroMediaId");
      return (
        <>
          <style>{foodMenuStyles}</style>
          <section className="foodMenu foodMenuHero">
            <div className="foodMenuHeroImage">
              <img
                alt={text(content, "heroImageAlt")}
                fetchPriority="high"
                height={1024}
                loading="eager"
                src={mediaId ? context.media.url(mediaId) : defaultHeroImage}
                width={1536}
              />
              <span className="foodMenuOpenStatus">
                <i aria-hidden />
                {text(content, "openStatus")}
              </span>
            </div>
            <div className="foodMenuHeroCopy">
              <span className="foodMenuKicker">{text(content, "eyebrow")}</span>
              <h1>{text(content, "headline")}</h1>
              <p>{text(content, "introduction")}</p>
              <a className="foodMenuHeroAction" href="#food-menu-categories">
                {localized(context.locale, "Explore the menu", "استكشف القائمة")}
                <span aria-hidden>↓</span>
              </a>
              <div className="foodMenuServiceNote">{text(content, "serviceNote")}</div>
            </div>
          </section>
        </>
      );
    },
  },
  {
    id: foodMenuCatalogId,
    title: "Categories, items & sizes",
    description: "The complete menu hierarchy with item images, fixed prices, and size variants.",
    category: "menu-catalog",
    editor: { group: "Menu", icon: "list" },
    schema: catalogSchema,
    defaults: {
      eyebrow: "Our menu",
      title: "Pick your favorite.",
      introduction: "Browse by category. Prices and availability are always kept up to date.",
      currency: "EGP",
      currencyBeforePrice: false,
      categories: createDefaultCategories(),
    },
    render: ({ value, context }) => {
      const content = record(value);
      const categories = list(content, "categories");
      const currency = text(content, "currency") || "EGP";
      const price = (amount: number) =>
        formatPrice(amount, currency, content.currencyBeforePrice === true);
      return (
        <section className="foodMenu foodMenuCatalog" id="food-menu-categories">
          <header className="foodMenuSectionIntro">
            <span>{text(content, "eyebrow")}</span>
            <h2>{text(content, "title")}</h2>
            <p>{text(content, "introduction")}</p>
          </header>
          <nav
            aria-label={localized(context.locale, "Menu categories", "أقسام القائمة")}
            className="foodMenuCategoryNav"
          >
            {categories.map((category, index) => (
              <a
                href={`#food-menu-${text(category, "id") || index}`}
                key={text(category, "id") || index}
              >
                {text(category, "name")}
              </a>
            ))}
          </nav>
          <div className="foodMenuCategoryStack">
            {categories.map((category, categoryIndex) => (
              <section
                className="foodMenuCategory"
                id={`food-menu-${text(category, "id") || categoryIndex}`}
                key={text(category, "id") || categoryIndex}
              >
                <header>
                  <span>{String(categoryIndex + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{text(category, "name")}</h3>
                    <p>{text(category, "description")}</p>
                  </div>
                </header>
                <div className="foodMenuItemGrid">
                  {list(category, "items").map((item, itemIndex) => {
                    const imageMediaId = text(item, "imageMediaId");
                    const sizes = list(item, "sizes");
                    const available = bool(item, "available");
                    return (
                      <article
                        className={`foodMenuItem${bool(item, "featured") ? " foodMenuItem--featured" : ""}${available ? "" : " foodMenuItem--unavailable"}`}
                        key={text(item, "id") || itemIndex}
                      >
                        {imageMediaId ? (
                          <img
                            alt={text(item, "name")}
                            height={700}
                            loading="lazy"
                            src={context.media.url(imageMediaId)}
                            width={900}
                          />
                        ) : null}
                        <div className="foodMenuItemBody">
                          <div className="foodMenuItemHeading">
                            <h4>{text(item, "name")}</h4>
                            {text(item, "pricingMode") === "fixed" ? (
                              <strong>{price(number(item, "price"))}</strong>
                            ) : null}
                          </div>
                          {text(item, "badge") ? (
                            <span className="foodMenuBadge">{text(item, "badge")}</span>
                          ) : null}
                          <p>{text(item, "description")}</p>
                          {text(item, "pricingMode") === "variants" ? (
                            <ul className="foodMenuSizes">
                              {sizes.map((size, sizeIndex) => (
                                <li key={text(size, "id") || sizeIndex}>
                                  <span>{text(size, "name")}</span>
                                  <strong>{price(number(size, "price"))}</strong>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {text(item, "additionalInfo") ? (
                            <small>{text(item, "additionalInfo")}</small>
                          ) : null}
                          {!available ? (
                            <span className="foodMenuUnavailable">
                              {localized(
                                context.locale,
                                "Currently unavailable",
                                "غير متاح حالياً",
                              )}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>
      );
    },
  },
  {
    id: foodMenuVisitId,
    title: "Visit, order & allergen details",
    description: "Practical business details and a direct phone or internal action.",
    category: "menu-details",
    editor: { group: "Business details", icon: "pin" },
    schema: visitSchema,
    defaults: {
      eyebrow: "Come by hungry",
      title: "A table, a takeaway, or coffee on the move.",
      body: "Drop in for an easy meal or call ahead and we will have your order ready.",
      hours: "Daily · 8:00 AM–11:00 PM",
      address: "Marsa Matrouh, Egypt",
      phone: "+20 100 000 0000",
      actionLabel: "Call to order",
      actionHref: "tel:+201000000000",
      dietaryNote:
        "Please tell our team about allergies before ordering. Ingredients and availability may change.",
    },
    render: ({ value, context }) => {
      const content = record(value);
      return (
        <section className="foodMenu foodMenuVisit">
          <div className="foodMenuVisitLead">
            <span>{text(content, "eyebrow")}</span>
            <h2>{text(content, "title")}</h2>
            <p>{text(content, "body")}</p>
          </div>
          <div className="foodMenuVisitDetails">
            <div>
              <small>{localized(context.locale, "Hours", "المواعيد")}</small>
              <strong>{text(content, "hours")}</strong>
            </div>
            <div>
              <small>{localized(context.locale, "Find us", "العنوان")}</small>
              <strong>{text(content, "address")}</strong>
            </div>
            <a href={text(content, "actionHref")}>
              {text(content, "actionLabel")} <span aria-hidden>↗</span>
            </a>
          </div>
          <p className="foodMenuDietary">{text(content, "dietaryNote")}</p>
        </section>
      );
    },
  },
  {
    id: foodMenuImportId,
    title: "PDF import & review",
    description: "Private authoring workflow; this section never renders on the public menu.",
    category: "menu-import",
    editor: { group: "Import", icon: "document" },
    schema: importSchema,
    defaults: {
      importDraft: {
        sourcePdfMediaId: null,
        sourceFilename: "",
        locale: "en",
        status: "not_started",
        extractedText: "",
        reviewNotes: "",
      },
    },
    render: () => null,
  },
];

function createDefaultCategories(): JsonValue {
  return [
    {
      id: "81000000-0000-4000-8000-000000000001",
      name: "Breakfast & Bakery",
      description: "Slow mornings, flaky layers, and eggs made your way.",
      items: [
        {
          id: "81100000-0000-4000-8000-000000000001",
          name: "Saffron Breakfast",
          description:
            "Two eggs, labneh, grilled halloumi, olives, tomato, herbs, and warm sourdough.",
          pricingMode: "fixed",
          price: 220,
          imageMediaId: null,
          badge: "House favorite",
          additionalInfo: "Vegetarian",
          available: true,
          featured: true,
          sizes: [{ id: "81200000-0000-4000-8000-000000000001", name: "Standard", price: 220 }],
        },
        {
          id: "81100000-0000-4000-8000-000000000002",
          name: "Butter Croissant",
          description: "Baked each morning with cultured butter and a crisp caramelized shell.",
          pricingMode: "fixed",
          price: 85,
          imageMediaId: null,
          badge: "",
          additionalInfo: "Contains dairy and gluten",
          available: true,
          featured: false,
          sizes: [{ id: "81200000-0000-4000-8000-000000000002", name: "Standard", price: 85 }],
        },
      ],
    },
    {
      id: "82000000-0000-4000-8000-000000000001",
      name: "Burgers & Pizza",
      description: "Comfort food built from proper ingredients and bold flavor.",
      items: [
        {
          id: "82100000-0000-4000-8000-000000000001",
          name: "The Neighborhood Burger",
          description:
            "Grilled beef, aged cheddar, tomato, pickles, crisp lettuce, and house sauce.",
          pricingMode: "fixed",
          price: 260,
          imageMediaId: null,
          badge: "Best seller",
          additionalInfo: "Add fries +55",
          available: true,
          featured: true,
          sizes: [{ id: "82200000-0000-4000-8000-000000000001", name: "Standard", price: 260 }],
        },
        {
          id: "82100000-0000-4000-8000-000000000002",
          name: "Wood-fired Margherita",
          description:
            "Long-fermented dough, tomato, mozzarella, basil, and extra-virgin olive oil.",
          pricingMode: "variants",
          price: 0,
          imageMediaId: null,
          badge: "",
          additionalInfo: "Vegetarian",
          available: true,
          featured: false,
          sizes: [
            { id: "82200000-0000-4000-8000-000000000002", name: "Small", price: 180 },
            { id: "82200000-0000-4000-8000-000000000003", name: "Medium", price: 245 },
            { id: "82200000-0000-4000-8000-000000000004", name: "Large", price: 320 },
          ],
        },
      ],
    },
    {
      id: "83000000-0000-4000-8000-000000000001",
      name: "Coffee & Cold Drinks",
      description: "Specialty coffee, fresh fruit, and bright drinks over ice.",
      items: [
        {
          id: "83100000-0000-4000-8000-000000000001",
          name: "Cappuccino",
          description: "Double espresso with textured milk and a balanced, chocolatey finish.",
          pricingMode: "variants",
          price: 0,
          imageMediaId: null,
          badge: "",
          additionalInfo: "Oat milk available",
          available: true,
          featured: false,
          sizes: [
            { id: "83200000-0000-4000-8000-000000000001", name: "Small", price: 85 },
            { id: "83200000-0000-4000-8000-000000000002", name: "Medium", price: 105 },
            { id: "83200000-0000-4000-8000-000000000003", name: "Large", price: 125 },
          ],
        },
        {
          id: "83100000-0000-4000-8000-000000000002",
          name: "Fresh Orange Juice",
          description: "Pressed to order and served cold, with no added sugar.",
          pricingMode: "fixed",
          price: 110,
          imageMediaId: null,
          badge: "Freshly pressed",
          additionalInfo: "Vegan",
          available: true,
          featured: false,
          sizes: [{ id: "83200000-0000-4000-8000-000000000004", name: "Standard", price: 110 }],
        },
      ],
    },
  ];
}

function formatPrice(amount: number, currency: string, before: boolean): string {
  const formatted = new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(amount);
  return before ? `${currency} ${formatted}` : `${formatted} ${currency}`;
}

const foodMenuStyles = String.raw`
  .siteRoot:has(.foodMenu){background:#f6f0e5;color:var(--theme-colors-text);color-scheme:light}
  [dir=rtl].siteRoot:has(.foodMenu),[dir=rtl] .foodMenu{font-family:var(--font-cairo),Cairo,Tahoma,Arial,sans-serif}
  [dir=rtl] .foodMenu h1,[dir=rtl] .foodMenu h2,[dir=rtl] .foodMenu h3,[dir=rtl] .foodMenu h4{font-family:var(--font-cairo),Cairo,Tahoma,Arial,sans-serif}
  .siteRoot:has(.foodMenu) .appearanceToggle{display:none!important}
  .siteRoot:has(.foodMenu) .siteHeader{position:sticky;top:0;min-height:70px;background:color-mix(in srgb,var(--theme-colors-surface) 94%,transparent);border-color:var(--theme-colors-border);z-index:50}
  .siteRoot:has(.foodMenu) .siteBrandMark{border-radius:50%;background:var(--theme-colors-surfaceVariant)}
  .siteRoot:has(.foodMenu) .siteFooter{background:var(--theme-colors-secondary);color:#fffaf1;border:0}
  .foodMenu{font-family:var(--theme-typography-font-families-body);scroll-margin-top:88px}
  .foodMenuHero{display:grid;min-height:calc(100svh - 70px);padding:0;background:var(--theme-colors-background)}
  .foodMenuHeroImage{position:relative;min-height:52svh;overflow:hidden}
  .foodMenuHeroImage:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 58%,rgba(30,22,16,.34))}
  .foodMenuHeroImage img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
  .foodMenuOpenStatus{position:absolute;inset-block-start:1.1rem;inset-inline-start:1.1rem;z-index:2;display:inline-flex;align-items:center;gap:.45rem;padding:.55rem .78rem;border-radius:999px;background:rgba(255,253,248,.92);box-shadow:0 10px 32px rgba(35,25,18,.14);font-size:.76rem;font-weight:750}
  .foodMenuOpenStatus i{width:.5rem;height:.5rem;border-radius:50%;background:var(--theme-colors-success);box-shadow:0 0 0 4px color-mix(in srgb,var(--theme-colors-success) 15%,transparent)}
  .foodMenuHeroCopy{min-width:0;padding:clamp(2.5rem,6vw,6rem);display:flex;flex-direction:column;align-items:flex-start;justify-content:center}
  [dir=rtl] .foodMenuHeroCopy{align-items:flex-start}
  .foodMenuKicker,.foodMenuSectionIntro>span,.foodMenuVisitLead>span{text-transform:uppercase;letter-spacing:.16em;color:var(--theme-colors-primary);font-size:.72rem;font-weight:800}
  .foodMenuHero h1{max-width:10ch;margin:.75rem 0 1rem;color:var(--theme-colors-heading);font:var(--theme-typography-font-weights-bold) clamp(3.15rem,13vw,6.8rem)/.92 var(--theme-typography-font-families-heading);letter-spacing:-.055em}
  [dir=rtl] .foodMenuHero h1{letter-spacing:-.025em;line-height:1.05}
  .foodMenuHeroCopy>p{max-width:38rem;margin:0;color:var(--theme-colors-text);font-size:clamp(1rem,2.4vw,1.25rem);line-height:1.65}
  .foodMenuHeroCopy>small{display:block;max-width:36rem;margin-top:.7rem;color:var(--theme-colors-muted)}
  .foodMenuHeroAction{display:inline-flex;align-items:center;gap:1rem;margin-top:1.5rem;padding:.9rem 1.2rem;border-radius:999px;background:var(--theme-colors-secondary);color:#fffaf1;text-decoration:none;font-weight:800;box-shadow:0 14px 34px color-mix(in srgb,var(--theme-colors-secondary) 20%,transparent);transition:transform .2s ease,box-shadow .2s ease}
  .foodMenuHeroAction:hover{transform:translateY(-2px);box-shadow:0 18px 42px color-mix(in srgb,var(--theme-colors-secondary) 25%,transparent)}
  .foodMenuServiceNote{margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--theme-colors-border);width:100%;color:var(--theme-colors-muted);font-size:.78rem;font-weight:700}
  .foodMenuCatalog{padding:4.5rem max(1rem,calc((100vw - 76rem)/2)) 6rem;background:var(--theme-colors-surface)}
  .foodMenuSectionIntro{max-width:46rem}
  .foodMenuSectionIntro h2,.foodMenuVisit h2{margin:.6rem 0 .9rem;color:var(--theme-colors-heading);font:var(--theme-typography-font-weights-bold) clamp(2.6rem,7vw,5.5rem)/.98 var(--theme-typography-font-families-heading);letter-spacing:-.045em}
  [dir=rtl] .foodMenuSectionIntro h2,[dir=rtl] .foodMenuVisit h2{line-height:1.12;letter-spacing:-.02em}
  .foodMenuSectionIntro p{max-width:38rem;color:var(--theme-colors-muted);line-height:1.7}
  .foodMenuCategoryNav{position:sticky;top:70px;z-index:40;display:flex;gap:.55rem;margin:2rem -1rem 0;padding:.8rem 1rem;overflow:auto;background:color-mix(in srgb,var(--theme-colors-surface) 94%,transparent);border-block:1px solid var(--theme-colors-border);backdrop-filter:blur(14px);scrollbar-width:none}
  .foodMenuCategoryNav::-webkit-scrollbar{display:none}
  .foodMenuCategoryNav a{flex:0 0 auto;padding:.65rem .9rem;border:1px solid var(--theme-colors-border);border-radius:999px;color:var(--theme-colors-heading);text-decoration:none;font-size:.82rem;font-weight:750;transition:background .18s ease,color .18s ease}
  .foodMenuCategoryNav a:hover{background:var(--theme-colors-secondary);border-color:var(--theme-colors-secondary);color:#fff}
  .foodMenuCategoryStack{display:grid;gap:4.5rem;margin-top:3.5rem}
  .foodMenuCategory{width:100%;min-width:0;padding:0;scroll-margin-top:9rem}
  .foodMenuCategory>header{display:flex;gap:1rem;align-items:flex-start;padding-bottom:1.25rem;border-bottom:2px solid var(--theme-colors-heading)}
  .foodMenuCategory>header>span{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:50%;background:var(--theme-colors-accent);color:var(--theme-colors-heading);font-size:.72rem;font-weight:900}
  .foodMenuCategory h3{margin:0;color:var(--theme-colors-heading);font:700 clamp(1.85rem,4vw,2.8rem)/1 var(--theme-typography-font-families-heading)}
  .foodMenuCategory header p{margin:.5rem 0 0;color:var(--theme-colors-muted)}
  .foodMenuItemGrid{display:grid;width:100%;min-width:0;gap:.85rem;margin-top:1rem}
  .foodMenuItem{overflow:hidden;background:var(--theme-colors-surface);border:1px solid var(--theme-colors-border);border-radius:1.25rem;box-shadow:0 10px 35px rgba(61,42,27,.06);transition:transform .22s ease,box-shadow .22s ease}
  .foodMenuItem:hover{transform:translateY(-3px);box-shadow:var(--theme-layout-shadows-card)}
  .foodMenuItem--featured{border-color:color-mix(in srgb,var(--theme-colors-primary) 46%,var(--theme-colors-border))}
  .foodMenuItem--unavailable{opacity:.62}
  .foodMenuItem>img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}
  .foodMenuItemBody{position:relative;padding:1.2rem}
  .foodMenuItemHeading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
  .foodMenuItem h4{margin:0;color:var(--theme-colors-heading);font:700 1.15rem/1.25 var(--theme-typography-font-families-heading)}
  .foodMenuItemHeading>strong{flex:0 0 auto;color:var(--theme-colors-primary);font-size:.88rem}
  .foodMenuBadge{display:inline-block;margin-top:.6rem;padding:.3rem .55rem;border-radius:999px;background:color-mix(in srgb,var(--theme-colors-accent) 22%,transparent);color:#6e4400;font-size:.67rem;font-weight:850;text-transform:uppercase;letter-spacing:.05em}
  .foodMenuItemBody>p{margin:.75rem 0;color:var(--theme-colors-muted);font-size:.9rem;line-height:1.6}
  .foodMenuItemBody>small{display:block;margin-top:.8rem;color:var(--theme-colors-muted);font-size:.72rem}
  .foodMenuSizes{display:grid;gap:.4rem;margin:.9rem 0 0;padding:.8rem 0 0;border-top:1px dashed var(--theme-colors-border);list-style:none}
  .foodMenuSizes li{display:flex;justify-content:space-between;gap:1rem;font-size:.82rem}
  .foodMenuSizes strong{color:var(--theme-colors-primary)}
  .foodMenuUnavailable{display:inline-block;margin-top:.8rem;color:var(--theme-colors-danger);font-size:.75rem;font-weight:800}
  .foodMenuVisit{padding:5rem max(1.25rem,calc((100vw - 76rem)/2));background:var(--theme-colors-secondary);color:#fffaf1}
  .foodMenuVisit h2{color:#fffaf1;max-width:13ch}
  .foodMenuVisitLead>p{max-width:39rem;color:rgba(255,250,241,.72);line-height:1.7}
  .foodMenuVisitDetails{display:grid;gap:.75rem;margin-top:2rem}
  .foodMenuVisitDetails>div,.foodMenuVisitDetails>a{display:flex;flex-direction:column;gap:.35rem;padding:1.15rem;border:1px solid rgba(255,255,255,.18);border-radius:1rem;color:#fff;text-decoration:none}
  .foodMenuVisitDetails small{color:rgba(255,255,255,.58);text-transform:uppercase;letter-spacing:.12em;font-size:.65rem}
  .foodMenuVisitDetails>a{flex-direction:row;justify-content:space-between;align-items:center;background:var(--theme-colors-accent);border-color:var(--theme-colors-accent);color:var(--theme-colors-heading);font-weight:850}
  .foodMenuDietary{margin:2rem 0 0;padding-top:1rem;border-top:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.62);font-size:.72rem}
  @media(min-width:48rem){.foodMenuHero{grid-template-columns:minmax(0,1.02fr) minmax(0,.98fr);min-height:clamp(42rem,calc(100svh - 78px),56rem)}.foodMenuHeroImage{min-width:0;min-height:clamp(42rem,calc(100svh - 78px),56rem);order:2}.foodMenuHeroCopy{padding-block:4rem}.foodMenuItemGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.foodMenuVisitDetails{grid-template-columns:1fr 1fr 1fr}.foodMenuCategoryNav{margin-inline:0;padding-inline:0}.foodMenuItem--featured{grid-row:span 1}}
  @media(min-width:70rem){.foodMenuItemGrid{grid-template-columns:repeat(auto-fit,minmax(min(20rem,100%),1fr))}.foodMenuCatalog{padding-block-start:7rem}.foodMenuCategoryStack{gap:6rem}}
  @media(max-width:47.99rem){.siteRoot:has(.foodMenu) .siteHeader{min-height:64px;padding-inline:1rem}.siteRoot:has(.foodMenu) .siteNavigationToggle{display:none}.foodMenuCategoryNav{top:64px}.foodMenuHeroCopy{padding-bottom:3.3rem}}
  @media(prefers-reduced-motion:reduce){.foodMenu *{scroll-behavior:auto!important;transition:none!important}}
`;
