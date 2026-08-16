import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { cafeMenuCatalogId, cafeMenuHeroId, cafeMenuVisitId } from "../ids";

const defaultHeroImage = "/templates/cafe-menu/cafe-menu-cover-v2.png";
const defaultItemImages = [
  "/templates/cafe-menu/menu-breakfast-v3.webp",
  "/templates/cafe-menu/menu-mains-v3.webp",
  "/templates/cafe-menu/menu-drinks-v3.webp",
] as const;

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
      .regex(/^(?:\/(?:[a-z0-9/_-]*)|tel:\+?[0-9 -]+|https:\/\/wa\.me\/[1-9][0-9]{7,14})$/i),
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

export const cafeMenuSections: readonly SectionDefinition[] = [
  {
    id: cafeMenuHeroId,
    title: "Business profile",
    description: "Restaurant name, welcome message, service status, and food photography.",
    category: "menu-identity",
    editor: { group: "Branding", icon: "store" },
    schema: heroSchema,
    defaults: {
      eyebrow: "Digital menu",
      headline: "Morning Room Café",
      introduction: "Coffee, breakfast, and all-day plates.",
      serviceNote: "Prices include VAT · Updated daily",
      openStatus: "Open today until 11 PM",
      heroImageAlt: "A café table with pizza, burger, coffee, juice, and fresh pastry",
      heroMediaId: null,
    },
    render: ({ value, context }) => {
      const content = record(value);
      const mediaId = text(content, "heroMediaId");
      return (
        <>
          <style>{cafeMenuStyles}</style>
          <section className="cafeMenu cafeMenuHero">
            <div className="cafeMenuHeroImage" aria-hidden="true">
              <img
                alt=""
                fetchPriority="high"
                height={1024}
                loading="eager"
                src={mediaId ? context.media.url(mediaId) : defaultHeroImage}
                width={1536}
              />
            </div>
            <div className="cafeMenuHeroShade" />
            <div className="cafeMenuHeroTopline">
              <span className="cafeMenuOpenStatus"><i aria-hidden />{text(content, "openStatus")}</span>
              <span className="cafeMenuServiceNote">{text(content, "serviceNote")}</span>
            </div>
            <div className="cafeMenuHeroCopy">
              <span className="cafeMenuKicker">{text(content, "eyebrow")}</span>
              <h1>{text(content, "headline")}</h1>
              <p>{text(content, "introduction")}</p>
              <a className="cafeMenuHeroAction" href="#cafe-menu-categories">
                <span>{localized(context.locale, "View today’s menu", "عرض قائمة اليوم")}</span>
                <b aria-hidden>↘</b>
              </a>
            </div>
            <div className="cafeMenuHeroIndex" aria-hidden><span>MENU</span><strong>01</strong></div>
          </section>
        </>
      );
    },
  },
  {
    id: cafeMenuCatalogId,
    title: "Categories, items & sizes",
    description: "The complete menu hierarchy with item images, fixed prices, and size variants.",
    category: "menu-catalog",
    editor: { group: "Menu", icon: "list" },
    schema: catalogSchema,
    defaults: {
      eyebrow: "Browse",
      title: "Menu",
      introduction: "Tap a category, choose your size, and check today’s availability.",
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
        <section className="cafeMenu cafeMenuCatalog" id="cafe-menu-categories">
          <header className="cafeMenuSectionIntro">
            <span>{text(content, "eyebrow")}</span>
            <h2>{text(content, "title")}</h2>
            <p>{text(content, "introduction")}</p>
          </header>
          <nav
            aria-label={localized(context.locale, "Menu categories", "أقسام القائمة")}
            className="cafeMenuCategoryNav"
          >
            {categories.map((category, index) => (
              <a
                href={`#cafe-menu-${text(category, "id") || index}`}
                key={text(category, "id") || index}
              >
                {text(category, "name")}
              </a>
            ))}
          </nav>
          <div className="cafeMenuCategoryStack">
            {categories.map((category, categoryIndex) => (
              <section
                className="cafeMenuCategory"
                id={`cafe-menu-${text(category, "id") || categoryIndex}`}
                key={text(category, "id") || categoryIndex}
              >
                <header>
                  <span>{String(categoryIndex + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{text(category, "name")}</h3>
                    <p>{text(category, "description")}</p>
                  </div>
                </header>
                <div className="cafeMenuItemGrid">
                  {list(category, "items").map((item, itemIndex) => {
                    const imageMediaId = text(item, "imageMediaId");
                    const sizes = list(item, "sizes");
                    const available = bool(item, "available");
                    return (
                      <article
                        className={`cafeMenuItem${bool(item, "featured") ? " cafeMenuItem--featured" : ""}${available ? "" : " cafeMenuItem--unavailable"}`}
                        key={text(item, "id") || itemIndex}
                      >
                        {imageMediaId ? (
                          <img
                            alt={text(item, "name")}
                            height={280}
                            loading="lazy"
                            src={context.media.url(imageMediaId)}
                            width={280}
                          />
                        ) : (
                          <img
                            alt=""
                            aria-hidden="true"
                            height={280}
                            loading="lazy"
                            src={defaultItemImages[categoryIndex % defaultItemImages.length]}
                            style={{ objectPosition: defaultItemPosition(categoryIndex, itemIndex) }}
                            width={280}
                          />
                        )}
                        <div className="cafeMenuItemBody">
                          <div className="cafeMenuItemHeading">
                            <div>
                              <h4>{text(item, "name")}</h4>
                              {text(item, "badge") ? (
                                <span className="cafeMenuBadge">{text(item, "badge")}</span>
                              ) : null}
                            </div>
                            <i aria-hidden />
                            {text(item, "pricingMode") === "fixed" ? (
                              <strong>{price(number(item, "price"))}</strong>
                            ) : null}
                          </div>
                          <p>{text(item, "description")}</p>
                          {text(item, "pricingMode") === "variants" ? (
                            <ul className="cafeMenuSizes">
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
                            <span className="cafeMenuUnavailable">
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
    id: cafeMenuVisitId,
    title: "Visit, order & allergen details",
    description: "Practical business details and a direct phone or internal action.",
    category: "menu-details",
    editor: { group: "Business details", icon: "pin" },
    schema: visitSchema,
    defaults: {
      eyebrow: "Visit or order",
      title: "Come in hungry. Leave happy.",
      body: "Find a corner, meet a friend, or message us ahead and collect your order when it suits you.",
      hours: "Daily · 8:00 AM–11:00 PM",
      address: "Marsa Matrouh, Egypt",
      phone: "+20 128 428 9997",
      actionLabel: "Order on WhatsApp",
      actionHref: "https://wa.me/201284289997",
      dietaryNote:
        "Please tell our team about allergies before ordering. Ingredients and availability may change.",
    },
    render: ({ value, context }) => {
      const content = record(value);
      return (
        <section className="cafeMenu cafeMenuVisit">
          <div className="cafeMenuVisitPaper">
            <div className="cafeMenuVisitLead">
              <span>{text(content, "eyebrow")}</span>
              <h2>{text(content, "title")}</h2>
              <p>{text(content, "body")}</p>
            </div>
            <div className="cafeMenuVisitDetails">
              <div>
                <small>{localized(context.locale, "Hours", "المواعيد")}</small>
                <strong>{text(content, "hours")}</strong>
              </div>
              <div>
                <small>{localized(context.locale, "Find us", "العنوان")}</small>
                <strong>{text(content, "address")}</strong>
              </div>
              <div>
                <small>{localized(context.locale, "Call", "اتصل بنا")}</small>
                <strong dir="ltr">{text(content, "phone")}</strong>
              </div>
              <a
                href={text(content, "actionHref")}
                rel={text(content, "actionHref").startsWith("https://") ? "noreferrer" : undefined}
                target={text(content, "actionHref").startsWith("https://") ? "_blank" : undefined}
              >
                {text(content, "actionLabel")} <span aria-hidden>↗</span>
              </a>
            </div>
            <p className="cafeMenuDietary">{text(content, "dietaryNote")}</p>
            <div className="cafeMenuVisitStamp" aria-hidden>MR<br /><small>EST. 2026</small></div>
          </div>
        </section>
      );
    },
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
          name: "Morning Room Breakfast",
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

function defaultItemPosition(categoryIndex: number, itemIndex: number): string {
  if (categoryIndex === 0) return itemIndex % 2 === 0 ? "70% 72%" : "10% 18%";
  return itemIndex % 2 === 0 ? "24% center" : "80% center";
}

const cafeMenuStyles = String.raw`
  .siteRoot:has(.cafeMenu){background:var(--theme-colors-background);color:var(--theme-colors-text)}
  .siteRoot[data-color-scheme=dark]:has(.cafeMenu){--theme-colors-background:#100d0b!important;--theme-colors-surface:#181310!important;--theme-colors-surface-variant:#241c17!important;--theme-colors-heading:#fffaf4!important;--theme-colors-text:#f1e8df!important;--theme-colors-muted:#c2b3a7!important;--theme-colors-border:rgba(255,244,232,.16)!important;--theme-colors-primary:#e3aa68!important;--theme-colors-primary-foreground:#1b120c!important;--theme-colors-secondary:#211813!important;--theme-colors-accent:#e3aa68!important;--primary:#e3aa68!important;--background:#100d0b!important;--text:#f1e8df!important}
  [dir=rtl].siteRoot:has(.cafeMenu),[dir=rtl] .cafeMenu{font-family:var(--font-cairo),Cairo,Tahoma,Arial,sans-serif}
  [dir=rtl] .cafeMenu h1,[dir=rtl] .cafeMenu h2,[dir=rtl] .cafeMenu h3,[dir=rtl] .cafeMenu h4{font-family:var(--font-cairo),Cairo,Tahoma,Arial,sans-serif}
  .siteRoot:has(.cafeMenu) .siteHeader{position:sticky;top:0;min-height:70px;background:color-mix(in srgb,var(--theme-colors-surface) 94%,transparent);border-color:var(--theme-colors-border);z-index:50}
  .siteRoot:has(.cafeMenu) .siteBrandMark{border-radius:50%;background:var(--theme-colors-surfaceVariant)}
  .siteRoot:has(.cafeMenu) .siteFooter{background:var(--theme-colors-secondary);color:#fffaf1;border:0}
  .cafeMenu{font-family:var(--theme-typography-font-families-body);scroll-margin-top:88px}
  .cafeMenuHero{display:grid;min-height:calc(100svh - 70px);padding:0;background:var(--theme-colors-background);isolation:isolate}
  .cafeMenuHeroImage{position:relative;min-height:52svh;overflow:hidden}
  .cafeMenuHeroImage:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 58%,rgba(30,22,16,.34))}
  .cafeMenuHeroImage img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
  .cafeMenuOpenStatus{position:absolute;inset-block-start:1.1rem;inset-inline-start:1.1rem;z-index:2;display:inline-flex;align-items:center;gap:.45rem;padding:.55rem .78rem;border-radius:999px;background:rgba(255,253,248,.92);box-shadow:0 10px 32px rgba(35,25,18,.14);font-size:.76rem;font-weight:750}
  .cafeMenuOpenStatus i{width:.5rem;height:.5rem;border-radius:50%;background:var(--theme-colors-success);box-shadow:0 0 0 4px color-mix(in srgb,var(--theme-colors-success) 15%,transparent)}
  .cafeMenuHeroCopy{min-width:0;padding:clamp(2.5rem,6vw,6rem);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;background:radial-gradient(circle at 18% 18%,color-mix(in srgb,var(--theme-colors-accent) 14%,transparent),transparent 18rem)}
  [dir=rtl] .cafeMenuHeroCopy{align-items:flex-start}
  .cafeMenuKicker,.cafeMenuSectionIntro>span,.cafeMenuVisitLead>span{text-transform:uppercase;letter-spacing:.16em;color:var(--theme-colors-primary);font-size:.72rem;font-weight:800}
  .cafeMenuHero h1{max-width:10ch;margin:.75rem 0 1rem;color:var(--theme-colors-heading);font:var(--theme-typography-font-weights-bold) clamp(3.15rem,13vw,6.8rem)/.92 var(--theme-typography-font-families-heading);letter-spacing:-.055em}
  [dir=rtl] .cafeMenuHero h1{letter-spacing:-.025em;line-height:1.05}
  .cafeMenuHeroCopy>p{max-width:38rem;margin:0;color:var(--theme-colors-text);font-size:clamp(1rem,2.4vw,1.25rem);line-height:1.65}
  .cafeMenuHeroCopy>small{display:block;max-width:36rem;margin-top:.7rem;color:var(--theme-colors-muted)}
  .cafeMenuHeroAction{display:inline-flex;align-items:center;gap:1rem;margin-top:1.5rem;padding:.9rem 1.2rem;border-radius:999px;background:var(--theme-colors-secondary);color:#fffaf1;text-decoration:none;font-weight:800;box-shadow:0 14px 34px color-mix(in srgb,var(--theme-colors-secondary) 20%,transparent);transition:transform .2s ease,box-shadow .2s ease}
  .cafeMenuHeroAction:hover{transform:translateY(-2px);box-shadow:0 18px 42px color-mix(in srgb,var(--theme-colors-secondary) 25%,transparent)}
  .cafeMenuHeroAction:focus-visible,.cafeMenuCategoryNav a:focus-visible,.cafeMenuVisitDetails>a:focus-visible{outline:3px solid var(--theme-colors-accent);outline-offset:3px}
  .cafeMenuServiceNote{margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--theme-colors-border);width:100%;color:var(--theme-colors-muted);font-size:.78rem;font-weight:700}
  .cafeMenuCatalog{padding:4.5rem max(1rem,calc((100vw - 76rem)/2)) 6rem;background:var(--theme-colors-surface)}
  .cafeMenuSectionIntro{max-width:46rem}
  .cafeMenuSectionIntro h2,.cafeMenuVisit h2{margin:.6rem 0 .9rem;color:var(--theme-colors-heading);font:var(--theme-typography-font-weights-bold) clamp(2.6rem,7vw,5.5rem)/.98 var(--theme-typography-font-families-heading);letter-spacing:-.045em}
  [dir=rtl] .cafeMenuSectionIntro h2,[dir=rtl] .cafeMenuVisit h2{line-height:1.12;letter-spacing:-.02em}
  .cafeMenuSectionIntro p{max-width:38rem;color:var(--theme-colors-muted);line-height:1.7}
  .cafeMenuCategoryNav{position:sticky;top:70px;z-index:40;display:flex;gap:.55rem;margin:2rem -1rem 0;padding:.8rem 1rem;overflow:auto;background:color-mix(in srgb,var(--theme-colors-surface) 94%,transparent);border-block:1px solid var(--theme-colors-border);backdrop-filter:blur(14px);scrollbar-width:none}
  .cafeMenuCategoryNav::-webkit-scrollbar{display:none}
  .cafeMenuCategoryNav a{flex:0 0 auto;padding:.65rem .9rem;border:1px solid var(--theme-colors-border);border-radius:999px;color:var(--theme-colors-heading);text-decoration:none;font-size:.82rem;font-weight:750;transition:background .18s ease,color .18s ease}
  .cafeMenuCategoryNav a:hover{background:var(--theme-colors-secondary);border-color:var(--theme-colors-secondary);color:#fff}
  .cafeMenuCategoryStack{display:grid;gap:4.5rem;margin-top:3.5rem}
  .cafeMenuCategory{width:100%;min-width:0;padding:0;scroll-margin-top:9rem}
  .cafeMenuCategory>header{display:flex;gap:1rem;align-items:flex-start;padding-bottom:1.25rem;border-bottom:2px solid var(--theme-colors-heading)}
  .cafeMenuCategory>header>span{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:50%;background:var(--theme-colors-accent);color:var(--theme-colors-heading);font-size:.72rem;font-weight:900}
  .cafeMenuCategory h3{margin:0;color:var(--theme-colors-heading);font:700 clamp(1.85rem,4vw,2.8rem)/1 var(--theme-typography-font-families-heading)}
  .cafeMenuCategory header p{margin:.5rem 0 0;color:var(--theme-colors-muted)}
  .cafeMenuItemGrid{display:grid;width:100%;min-width:0;gap:clamp(.7rem,1vw,.95rem);margin-top:1rem}
  .cafeMenuItem{overflow:hidden;background:var(--theme-colors-surface);border:1px solid var(--theme-colors-border);border-radius:1.15rem;box-shadow:0 10px 35px rgba(61,42,27,.06);transition:transform .22s ease,box-shadow .22s ease}
  .cafeMenuItem:hover{transform:translateY(-3px);box-shadow:var(--theme-layout-shadows-card)}
  .cafeMenuItem--featured{border-color:color-mix(in srgb,var(--theme-colors-primary) 46%,var(--theme-colors-border))}
  .cafeMenuItem--unavailable{opacity:.62}
  .cafeMenuItem>img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
  .cafeMenuItemBody{position:relative;padding:.95rem}
  .cafeMenuItemHeading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
  .cafeMenuItem h4{margin:0;color:var(--theme-colors-heading);font:700 1.02rem/1.28 var(--theme-typography-font-families-heading)}
  .cafeMenuItemHeading>strong{flex:0 0 auto;color:var(--theme-colors-primary);font-size:.8rem}
  .cafeMenuBadge{display:inline-block;margin-top:.6rem;padding:.3rem .55rem;border-radius:999px;background:color-mix(in srgb,var(--theme-colors-accent) 22%,transparent);color:#6e4400;font-size:.67rem;font-weight:850;text-transform:uppercase;letter-spacing:.05em}
  .cafeMenuItemBody>p{margin:.65rem 0;color:var(--theme-colors-muted);font-size:.82rem;line-height:1.55}
  .cafeMenuItemBody>small{display:block;margin-top:.8rem;color:var(--theme-colors-muted);font-size:.72rem}
  .cafeMenuSizes{display:grid;gap:.4rem;margin:.9rem 0 0;padding:.8rem 0 0;border-top:1px dashed var(--theme-colors-border);list-style:none}
  .cafeMenuSizes li{display:flex;justify-content:space-between;gap:1rem;font-size:.82rem}
  .cafeMenuSizes strong{color:var(--theme-colors-primary)}
  .cafeMenuUnavailable{display:inline-block;margin-top:.8rem;color:var(--theme-colors-danger);font-size:.75rem;font-weight:800}
  .cafeMenuVisit{padding:5rem max(1.25rem,calc((100vw - 76rem)/2));background:var(--theme-colors-secondary);color:#fffaf1}
  .cafeMenuVisit h2{color:#fffaf1;max-width:13ch}
  .cafeMenuVisitLead>p{max-width:39rem;color:rgba(255,250,241,.72);line-height:1.7}
  .cafeMenuVisitDetails{display:grid;gap:.75rem;margin-top:2rem}
  .cafeMenuVisitDetails>div,.cafeMenuVisitDetails>a{display:flex;flex-direction:column;gap:.35rem;padding:1.15rem;border:1px solid rgba(255,255,255,.18);border-radius:1rem;color:#fff;text-decoration:none}
  .cafeMenuVisitDetails small{color:rgba(255,255,255,.58);text-transform:uppercase;letter-spacing:.12em;font-size:.65rem}
  .cafeMenuVisitDetails>a{flex-direction:row;justify-content:space-between;align-items:center;background:var(--theme-colors-accent);border-color:var(--theme-colors-accent);color:var(--theme-colors-heading);font-weight:850}
  .cafeMenuDietary{margin:2rem 0 0;padding-top:1rem;border-top:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.62);font-size:.72rem}
  @media(min-width:36rem) and (max-width:47.99rem){.cafeMenuItemGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(min-width:48rem){.cafeMenuHero{grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);width:min(calc(100% - 2rem),86rem);min-height:clamp(42rem,calc(100svh - 100px),54rem);margin:1rem auto 3rem;overflow:hidden;border:1px solid var(--theme-colors-border);border-radius:1.75rem;box-shadow:var(--theme-layout-shadows-card)}.cafeMenuHeroImage{min-width:0;min-height:clamp(42rem,calc(100svh - 100px),54rem);order:2}.cafeMenuHeroCopy{padding-block:4rem}.cafeMenuItemGrid{grid-template-columns:repeat(auto-fill,minmax(min(15.25rem,100%),1fr))}.cafeMenuVisitDetails{grid-template-columns:1fr 1fr 1fr}.cafeMenuCategoryNav{margin-inline:0;padding-inline:0}.cafeMenuItem--featured{grid-row:span 1}}
  @media(min-width:70rem){.cafeMenuItemGrid{grid-template-columns:repeat(auto-fill,minmax(min(16rem,100%),1fr))}.cafeMenuCatalog{padding-block-start:7rem}.cafeMenuCategoryStack{gap:6rem}}
  @media(max-width:47.99rem){.siteRoot:has(.cafeMenu) .siteHeader{min-height:64px;padding-inline:1rem}.siteRoot:has(.cafeMenu) .siteNavigationToggle{display:none}.cafeMenuCategoryNav{top:64px}.cafeMenuHeroCopy{padding-bottom:3.3rem}}
  @media(max-width:35.99rem){.cafeMenuItem{display:grid;grid-template-columns:6.75rem minmax(0,1fr);align-items:stretch}.cafeMenuItem>img{height:100%;min-height:100%;aspect-ratio:auto}.cafeMenuItemBody{padding:.8rem}.cafeMenuItemHeading{gap:.55rem}.cafeMenuItem h4{font-size:.96rem}.cafeMenuBadge{margin-top:.45rem}.cafeMenuItemBody>p{margin:.5rem 0;font-size:.78rem}.cafeMenuSizes{margin-top:.6rem;padding-top:.6rem}}
  /* V2: an editorial menu-cover system, intentionally distinct from the food-menu template. */
  .siteRoot:has(.cafeMenu) .siteHeader{position:relative;top:auto;min-height:76px;background:var(--theme-colors-background);border:0}
  .siteRoot:has(.cafeMenu) .siteBrandMark{border-radius:.25rem}
  .cafeMenuHero{position:relative;display:block;width:min(calc(100% - 2rem),90rem);min-height:clamp(38rem,78svh,56rem);margin:0 auto;padding:0;overflow:hidden;border:0;border-radius:0 0 3.5rem 3.5rem;background:#211812;color:#fff;box-shadow:none}
  .cafeMenuHeroImage{position:absolute;inset:0;min-height:0;overflow:hidden}
  .cafeMenuHeroImage:after{display:none}
  .cafeMenuHeroImage img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
  .cafeMenuHeroShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(26,17,12,.82) 0%,rgba(26,17,12,.56) 38%,rgba(26,17,12,.08) 72%),linear-gradient(0deg,rgba(20,13,9,.35),transparent 50%)}
  [dir=rtl] .cafeMenuHeroShade{transform:scaleX(-1)}
  .cafeMenuHeroTopline{position:absolute;z-index:2;inset-block-start:1.6rem;inset-inline:clamp(1.25rem,4vw,4rem);display:flex;justify-content:space-between;align-items:center;gap:1rem;color:#fff;width:auto}
  .cafeMenuOpenStatus{position:static;padding:.6rem .85rem;border:1px solid rgba(255,255,255,.28);border-radius:.3rem;background:rgba(24,16,11,.28);box-shadow:none;color:#fff;font-size:.7rem;letter-spacing:.04em;backdrop-filter:blur(12px)}
  .cafeMenuOpenStatus i{background:#a9d69c;box-shadow:none}
  .cafeMenuServiceNote{width:auto;margin:0;padding:0;border:0;color:rgba(255,255,255,.72);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase}
  .cafeMenuHeroCopy{position:absolute;z-index:2;inset-inline-start:clamp(1.5rem,7vw,7.5rem);inset-block-end:clamp(3rem,9vh,7rem);display:block;width:min(42rem,calc(100% - 3rem));padding:0;background:none;color:#fff}
  .cafeMenuKicker{color:#edc488;font-size:.68rem;letter-spacing:.2em}
  .cafeMenuHero h1{max-width:9ch;margin:.8rem 0 1.25rem;color:#fff;font:500 clamp(3.8rem,8.6vw,8.4rem)/.82 Georgia,'Noto Naskh Arabic',serif;letter-spacing:-.065em;text-wrap:balance}
  [dir=rtl] .cafeMenuHero h1{font-size:clamp(3rem,7vw,6.5rem);line-height:.98;letter-spacing:-.035em}
  .cafeMenuHeroCopy>p{max-width:34rem;margin:0;color:rgba(255,255,255,.82);font-size:clamp(.95rem,1.6vw,1.15rem);line-height:1.7}
  .cafeMenuHeroAction{display:inline-flex;margin-top:1.7rem;padding:0 0 .55rem;gap:2.5rem;border-bottom:1px solid #edc488;border-radius:0;background:none;color:#fff;box-shadow:none;font-size:.8rem;letter-spacing:.05em}
  .cafeMenuHeroAction:hover{transform:none;box-shadow:none;color:#edc488}
  .cafeMenuHeroAction b{font-size:1.15rem;font-weight:400}
  .cafeMenuHeroIndex{position:absolute;z-index:2;inset-inline-end:clamp(1.25rem,3vw,3rem);inset-block-end:2rem;display:flex;align-items:end;gap:.65rem;color:#fff;writing-mode:vertical-rl}
  .cafeMenuHeroIndex span{font-size:.55rem;letter-spacing:.26em}
  .cafeMenuHeroIndex strong{font:400 2.1rem/1 Georgia,serif}
  .cafeMenuCatalog{display:block;padding:clamp(5rem,9vw,9rem) max(1.25rem,calc((100vw - 78rem)/2));background:var(--theme-colors-background)}
  .cafeMenuSectionIntro{display:grid;grid-template-columns:minmax(0,1fr) minmax(16rem,.62fr);gap:2rem;align-items:end;max-width:none;padding-bottom:2.5rem;border-bottom:1px solid var(--theme-colors-heading)}
  .cafeMenuSectionIntro>span{grid-column:1/-1}
  .cafeMenuSectionIntro h2{max-width:12ch;margin:0;color:var(--theme-colors-heading);font:500 clamp(3rem,7vw,6rem)/.9 Georgia,'Noto Naskh Arabic',serif;letter-spacing:-.055em}
  .cafeMenuSectionIntro p{margin:0;color:var(--theme-colors-muted);font-size:.95rem}
  .cafeMenuCategoryNav{position:static;display:flex;gap:.45rem;margin:1.3rem 0 0;padding:0 0 1.3rem;overflow:auto;border:0;border-bottom:1px solid var(--theme-colors-border);background:none;backdrop-filter:none}
  .cafeMenuCategoryNav a{padding:.55rem .9rem;border:0;border-radius:.25rem;background:var(--theme-colors-surfaceVariant);font-size:.73rem;letter-spacing:.03em}
  .cafeMenuCategoryStack{display:grid;gap:0;margin-top:0}
  .cafeMenuCategory{display:grid;grid-template-columns:minmax(10rem,.35fr) minmax(0,1fr);gap:clamp(2rem,6vw,6rem);padding:clamp(4rem,7vw,6.5rem) 0;border-bottom:1px solid var(--theme-colors-border);scroll-margin-top:1rem}
  .cafeMenuCategory>header{position:sticky;top:1.5rem;display:block;align-self:start;padding:0;border:0}
  .cafeMenuCategory>header>span{display:block;width:auto;height:auto;margin-bottom:1.1rem;border-radius:0;background:none;color:var(--theme-colors-primary);font:400 1rem/1 Georgia,serif}
  .cafeMenuCategory h3{max-width:8ch;font:500 clamp(2.2rem,4vw,4rem)/.94 Georgia,'Noto Naskh Arabic',serif;letter-spacing:-.04em}
  .cafeMenuCategory header p{max-width:15rem;margin-top:1rem;font-size:.78rem;line-height:1.55}
  .cafeMenuItemGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 clamp(2rem,5vw,5rem);margin:0}
  .cafeMenuItem{display:block;padding:1.35rem 0;overflow:visible;border:0;border-bottom:1px dotted var(--theme-colors-border);border-radius:0;background:none;box-shadow:none;transition:none}
  .cafeMenuItem:hover{transform:none;box-shadow:none}
  .cafeMenuItem--featured{border-color:var(--theme-colors-primary)}
  .cafeMenuItem>img{float:inline-start;width:4.5rem;height:4.5rem;margin-inline-end:.85rem;aspect-ratio:1;object-fit:cover;border-radius:50%}
  .cafeMenuItemBody{padding:0}
  .cafeMenuItemHeading{display:flex;align-items:baseline;gap:.65rem}
  .cafeMenuItemHeading>div{display:flex;min-width:0;align-items:center;gap:.55rem}
  .cafeMenuItemHeading>i{flex:1 1 auto;min-width:1rem;border-bottom:1px dotted var(--theme-colors-border)}
  .cafeMenuItem h4{font:700 .98rem/1.3 var(--theme-typography-font-families-body)}
  .cafeMenuItemHeading>strong{font-size:.78rem;white-space:nowrap}
  .cafeMenuBadge{display:inline-flex;margin:0;padding:.24rem .4rem;border-radius:.2rem;background:var(--theme-colors-primary);color:var(--theme-colors-primary-foreground);font-size:.53rem;letter-spacing:.07em;white-space:nowrap}
  .cafeMenuItemBody>p{max-width:32rem;margin:.55rem 0 .3rem;color:var(--theme-colors-muted);font-size:.76rem;line-height:1.55}
  .cafeMenuItemBody>small{margin-top:.4rem;font-size:.65rem;font-style:italic}
  .cafeMenuSizes{gap:.25rem;margin:.55rem 0 0;padding:.5rem 0 0;border:0}
  .cafeMenuSizes li{font-size:.72rem}
  .cafeMenuVisit{position:relative;padding:clamp(4rem,8vw,8rem) max(1rem,calc((100vw - 82rem)/2));background:#1d2922;color:#f6efe5}
  .cafeMenuVisitPaper{position:relative;display:grid;grid-template-columns:minmax(0,.9fr) minmax(20rem,1.1fr);gap:clamp(3rem,8vw,8rem);padding:clamp(2rem,6vw,6rem);overflow:hidden;border-radius:.4rem;background:#f2eadf;color:#27221d;box-shadow:0 24px 70px rgba(0,0,0,.2)}
  .cafeMenuVisitLead>span{color:#a45f38}
  .cafeMenuVisit h2{max-width:9ch;margin:.75rem 0 1.2rem;color:#27221d;font:500 clamp(3rem,6vw,5.6rem)/.9 Georgia,'Noto Naskh Arabic',serif;letter-spacing:-.055em}
  .cafeMenuVisitLead>p{max-width:30rem;color:#756b62}
  .cafeMenuVisitDetails{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:0;align-content:start;border-top:1px solid #cfc0b0}
  .cafeMenuVisitDetails>div,.cafeMenuVisitDetails>a{padding:1.2rem 0;border:0;border-bottom:1px solid #cfc0b0;border-radius:0;color:#27221d}
  .cafeMenuVisitDetails>div:nth-child(odd){padding-inline-end:1rem}
  .cafeMenuVisitDetails>div:nth-child(even){padding-inline-start:1rem;border-inline-start:1px solid #cfc0b0}
  .cafeMenuVisitDetails small{color:#8b7968}
  .cafeMenuVisitDetails>a{grid-column:1/-1;flex-direction:row;padding:1rem 1.1rem;margin-top:1rem;border:0;background:#a45f38;color:#fff}
  .cafeMenuDietary{grid-column:2;margin:1.4rem 0 0;padding:0;border:0;color:#817368;font-size:.65rem}
  .cafeMenuVisitStamp{position:absolute;inset-inline-start:1.5rem;inset-block-end:1.25rem;display:grid;place-items:center;width:5.5rem;height:5.5rem;border:1px solid rgba(164,95,56,.5);border-radius:50%;color:rgba(164,95,56,.65);font:500 1.6rem/1 Georgia,serif;text-align:center;transform:rotate(-8deg)}
  .cafeMenuVisitStamp small{font:700 .42rem/1 sans-serif;letter-spacing:.12em}
  .siteRoot[data-color-scheme=dark]:has(.cafeMenu) .cafeMenuVisitPaper{background:#201a16;color:#f5ede4}
  .siteRoot[data-color-scheme=dark]:has(.cafeMenu) .cafeMenuVisit h2,.siteRoot[data-color-scheme=dark]:has(.cafeMenu) .cafeMenuVisitDetails>div{color:#f5ede4}
  .siteRoot[data-color-scheme=dark]:has(.cafeMenu) .cafeMenuVisitDetails{border-color:#4a3b32}
  .siteRoot[data-color-scheme=dark]:has(.cafeMenu) .cafeMenuVisitDetails>div{border-color:#4a3b32}
  @media(max-width:55rem){.cafeMenuHero{width:100%;border-radius:0 0 2rem 2rem}.cafeMenuHeroShade{background:linear-gradient(0deg,rgba(25,16,11,.88) 0%,rgba(25,16,11,.28) 70%)}.cafeMenuSectionIntro{grid-template-columns:1fr}.cafeMenuSectionIntro>span{grid-column:auto}.cafeMenuCategory{grid-template-columns:1fr;gap:2rem}.cafeMenuCategory>header{position:static;display:grid;grid-template-columns:auto 1fr;gap:1rem}.cafeMenuCategory>header>span{grid-row:1/3}.cafeMenuCategory h3{max-width:none}.cafeMenuCategory header p{max-width:34rem}.cafeMenuVisitPaper{grid-template-columns:1fr}.cafeMenuDietary{grid-column:auto}.cafeMenuVisitStamp{display:none}}
  @media(max-width:38rem){.siteRoot:has(.cafeMenu) .siteHeader{min-height:64px}.cafeMenuHero{min-height:calc(100svh - 64px)}.cafeMenuHeroTopline{inset-block-start:1rem}.cafeMenuServiceNote{display:none}.cafeMenuHero h1{font-size:clamp(3.45rem,17vw,5.2rem)}[dir=rtl] .cafeMenuHero h1{font-size:clamp(2.8rem,13vw,4.4rem)}.cafeMenuHeroIndex{display:none}.cafeMenuItemGrid{grid-template-columns:1fr}.cafeMenuItem{display:block;grid-template-columns:none}.cafeMenuItem>img{height:4rem;min-height:0}.cafeMenuVisitDetails{grid-template-columns:1fr}.cafeMenuVisitDetails>div:nth-child(odd),.cafeMenuVisitDetails>div:nth-child(even){padding-inline:0;border-inline:0}.cafeMenuVisitDetails>a{grid-column:auto}}
  /* V3: compact scan-menu layout with bilingual, photo-led item rows. */
  .siteRoot:has(.cafeMenu){background:var(--theme-colors-surfaceVariant)}
  .siteRoot:has(.cafeMenu) .siteHeader{position:sticky;top:0;z-index:60;min-height:60px;background:color-mix(in srgb,var(--theme-colors-surface) 96%,transparent);border-bottom:1px solid var(--theme-colors-border);backdrop-filter:blur(14px)}
  .siteRoot:has(.cafeMenu) .siteFooter{display:none}
  .cafeMenuHero{width:min(100%,64rem);min-height:19rem;margin:0 auto;border-radius:0;background:#211812}
  .cafeMenuHeroImage img{object-position:center 62%}
  .cafeMenuHeroShade{background:linear-gradient(0deg,rgba(25,16,11,.9) 0%,rgba(25,16,11,.22) 86%)}
  [dir=rtl] .cafeMenuHeroShade{transform:none}
  .cafeMenuHeroTopline{inset-block-start:1rem;inset-inline:1rem}
  .cafeMenuOpenStatus{padding:.48rem .65rem;font-size:.62rem}
  .cafeMenuServiceNote{font-size:.58rem}
  .cafeMenuHeroCopy{inset-inline:1.25rem;inset-block-end:1.35rem;width:calc(100% - 2.5rem)}
  .cafeMenuKicker{font-size:.58rem;letter-spacing:.17em}
  .cafeMenuHero h1{max-width:none;margin:.35rem 0 .35rem;font:600 clamp(2.25rem,7vw,4.15rem)/1 Georgia,'Noto Naskh Arabic',serif;letter-spacing:-.045em}
  [dir=rtl] .cafeMenuHero h1{font-size:clamp(2.1rem,7vw,3.7rem);line-height:1.08}
  .cafeMenuHeroCopy>p{font-size:.82rem;line-height:1.45}
  .cafeMenuHeroAction,.cafeMenuHeroIndex{display:none}
  .cafeMenuCatalog{width:min(100%,64rem);margin:0 auto;padding:1.25rem 1rem 4rem;background:var(--theme-colors-background)}
  .cafeMenuSectionIntro{display:flex;align-items:end;justify-content:space-between;gap:1rem;padding:.8rem 0 1rem;border:0}
  .cafeMenuSectionIntro>span{display:none}
  .cafeMenuSectionIntro h2{max-width:none;font:650 clamp(2rem,5vw,3rem)/1 var(--theme-typography-font-families-heading);letter-spacing:-.035em}
  .cafeMenuSectionIntro p{max-width:28rem;font-size:.72rem;line-height:1.5;text-align:end}
  .cafeMenuCategoryNav{position:sticky;top:60px;z-index:45;margin:0 -1rem;padding:.75rem 1rem;border-block:1px solid var(--theme-colors-border);background:color-mix(in srgb,var(--theme-colors-background) 95%,transparent);backdrop-filter:blur(14px)}
  .cafeMenuCategoryNav a{padding:.62rem .85rem;border:1px solid var(--theme-colors-border);border-radius:999px;background:var(--theme-colors-surface);font-size:.7rem}
  .cafeMenuCategoryNav a:first-child{border-color:var(--theme-colors-secondary);background:var(--theme-colors-secondary);color:#fff}
  .cafeMenuCategory{display:block;padding:2.5rem 0 0;border:0;scroll-margin-top:7.5rem}
  .cafeMenuCategory>header{position:static;display:flex;align-items:baseline;gap:.75rem;padding:0 0 .9rem;border-bottom:2px solid var(--theme-colors-heading)}
  .cafeMenuCategory>header>span{flex:0 0 auto;margin:0;color:var(--theme-colors-primary);font-size:.7rem}
  .cafeMenuCategory>header>div{display:flex;flex:1;align-items:baseline;justify-content:space-between;gap:1rem}
  .cafeMenuCategory h3{max-width:none;font:700 clamp(1.35rem,3vw,1.8rem)/1.1 var(--theme-typography-font-families-heading);letter-spacing:-.025em}
  .cafeMenuCategory header p{max-width:28rem;margin:0;color:var(--theme-colors-muted);font-size:.68rem;text-align:end}
  .cafeMenuItemGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;margin-top:.8rem}
  .cafeMenuItem{display:grid;grid-template-columns:7.25rem minmax(0,1fr);min-height:9.5rem;padding:0;overflow:hidden;border:1px solid var(--theme-colors-border);border-radius:.8rem;background:var(--theme-colors-surface);box-shadow:0 6px 20px rgba(45,30,20,.05)}
  .cafeMenuItem--featured{border-color:color-mix(in srgb,var(--theme-colors-primary) 55%,var(--theme-colors-border))}
  .cafeMenuItem>img{float:none;width:100%;height:100%;min-height:9.5rem;margin:0;border-radius:0;object-fit:cover}
  .cafeMenuItemBody{display:flex;min-width:0;flex-direction:column;padding:.85rem}
  .cafeMenuItemHeading{align-items:flex-start}
  .cafeMenuItemHeading>div{display:block}
  .cafeMenuItemHeading>i{display:none}
  .cafeMenuItem h4{font-size:.9rem;line-height:1.25}
  .cafeMenuBadge{margin-top:.35rem}
  .cafeMenuItemBody>p{margin:.48rem 0;color:var(--theme-colors-muted);font-size:.68rem;line-height:1.45}
  .cafeMenuItemBody>small{margin-top:auto;font-size:.6rem}
  .cafeMenuSizes{margin-top:auto;padding-top:.45rem;border-top:1px dotted var(--theme-colors-border)}
  .cafeMenuSizes li{font-size:.67rem}
  .cafeMenuVisit{width:min(100%,64rem);margin:0 auto;padding:0 1rem 1rem;background:var(--theme-colors-background)}
  .cafeMenuVisitPaper{grid-template-columns:minmax(0,.8fr) minmax(20rem,1.2fr);gap:2rem;padding:1.5rem;border-radius:.8rem;background:var(--theme-colors-surface);color:var(--theme-colors-text);box-shadow:none;border:1px solid var(--theme-colors-border)}
  .cafeMenuVisit h2{max-width:none;margin:.35rem 0 .55rem;color:var(--theme-colors-heading);font:700 clamp(1.5rem,4vw,2.25rem)/1.1 var(--theme-typography-font-families-heading);letter-spacing:-.03em}
  .cafeMenuVisitLead>p{font-size:.72rem;line-height:1.5}
  .cafeMenuVisitDetails>div,.cafeMenuVisitDetails>a{padding:.75rem 0}
  .cafeMenuVisitDetails strong{font-size:.72rem}
  .cafeMenuVisitDetails>a{padding:.75rem .9rem}
  .cafeMenuDietary{margin-top:.75rem;font-size:.58rem}
  .cafeMenuVisitStamp{display:none}
  .siteRoot[data-color-scheme=dark]:has(.cafeMenu) .cafeMenuVisitPaper{background:var(--theme-colors-surface);color:var(--theme-colors-text)}
  .siteRoot[data-color-scheme=dark]:has(.cafeMenu) .cafeMenuVisit h2,.siteRoot[data-color-scheme=dark]:has(.cafeMenu) .cafeMenuVisitDetails>div{color:var(--theme-colors-heading)}
  @media(max-width:46rem){.cafeMenuHero{min-height:17rem}.cafeMenuServiceNote{display:none}.cafeMenuSectionIntro{display:block}.cafeMenuSectionIntro p{margin-top:.45rem;text-align:start}.cafeMenuCategory>header>div{display:block}.cafeMenuCategory header p{margin-top:.35rem;text-align:start}.cafeMenuItemGrid{grid-template-columns:1fr}.cafeMenuItem{grid-template-columns:6.75rem minmax(0,1fr);min-height:8.7rem}.cafeMenuItem>img{height:100%;min-height:8.7rem}.cafeMenuVisitPaper{grid-template-columns:1fr}.cafeMenuVisitDetails{grid-template-columns:1fr 1fr}.cafeMenuDietary{grid-column:auto}}
  @media(max-width:26rem){.cafeMenuItem{grid-template-columns:5.7rem minmax(0,1fr)}.cafeMenuItem>img{min-height:8.5rem}.cafeMenuVisitDetails{grid-template-columns:1fr}.cafeMenuVisitDetails>div:nth-child(odd),.cafeMenuVisitDetails>div:nth-child(even){padding-inline:0;border-inline:0}}
  @media(prefers-reduced-motion:reduce){.cafeMenu *{scroll-behavior:auto!important;transition:none!important}}
`;
