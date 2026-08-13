import Link from "next/link";
import { PendingSubmit } from "@/app/pending-submit";
import { createEcommerceStoreAction } from "./actions";
import { dashboardLocale } from "@/server/dashboard-locale";
import { loadEcommerceStores, loadEcommerceTemplates } from "@/server/ecommerce";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    eyebrow: "Independent commerce platform",
    title: "E-commerce",
    description: "Run storefronts, products, orders, customers, checkout, and analytics from one workspace.",
    newStore: "New store",
    browseTemplates: "Browse templates",
    stores: "Stores",
    activeStores: "Active stores",
    products: "Products",
    orders: "Orders",
    portfolioEyebrow: "Store portfolio",
    managedStores: "Managed stores",
    yourStores: "Your stores",
    portfolioDescription: "Open a storefront or continue managing its catalog and operations.",
    noStores: "No commerce stores are assigned yet.",
    noStoresHelp: "Create the first store to start building a product catalog.",
    active: "Active",
    draft: "Draft",
    paused: "Paused",
    generalTemplate: "Presentation",
    customers: "Customers",
    owner: "Owner",
    ownerNotClaimed: "Owner not claimed",
    viewStorefront: "View storefront",
    manageStore: "Manage store",
    provisioning: "Provisioning",
    createStore: "Create a commerce store",
    createDescription: "Creates a separate commerce workspace. Templates only control presentation; business data remains independent.",
    storeName: "Store name",
    storeNameHint: "The customer-facing store name",
    storeNamePlaceholder: "Matrouh Market",
    storeSlug: "Store slug",
    storeSlugHint: "Used as the internal store identifier",
    storeSlugPlaceholder: "matrouh-market",
    hostname: "Hostname",
    hostnameHint: "The local or custom storefront domain",
    hostnamePlaceholder: "market.localhost",
    whatsapp: "Store WhatsApp number",
    whatsappHint: "Receives complete customer orders with delivery details",
    whatsappPlaceholder: "+20 128 428 9997",
    template: "Template",
    defaultLanguage: "Default language",
    currency: "Currency",
    english: "English",
    arabic: "Arabic",
    egyptianPound: "EGP — Egyptian pound",
    usDollar: "USD — US dollar",
    euro: "EUR — Euro",
    createIndependentStore: "Create independent store",
    creatingStore: "Creating store…",
    createInvalid: "Enter a valid store name, slug, and hostname, then try again.",
    createConflict: "That store slug or hostname is already in use. Choose another one.",
    createFailed: "The store could not be created. Please try again.",
    templatesUnavailable: "No ready commerce template is available.",
  },
  ar: {
    eyebrow: "منصة تجارة إلكترونية مستقلة",
    title: "التجارة الإلكترونية",
    description: "أدر المتاجر والمنتجات والطلبات والعملاء والدفع والتحليلات من مساحة عمل واحدة.",
    newStore: "متجر جديد",
    browseTemplates: "استعراض القوالب",
    stores: "المتاجر",
    activeStores: "المتاجر النشطة",
    products: "المنتجات",
    orders: "الطلبات",
    portfolioEyebrow: "مجموعة المتاجر",
    managedStores: "المتاجر المُدارة",
    yourStores: "متاجرك",
    portfolioDescription: "افتح واجهة المتجر أو واصل إدارة الكتالوج والعمليات.",
    noStores: "لا توجد متاجر إلكترونية معيّنة حتى الآن.",
    noStoresHelp: "أنشئ أول متجر لبدء تجهيز كتالوج المنتجات.",
    active: "نشط",
    draft: "مسودة",
    paused: "متوقف مؤقتًا",
    generalTemplate: "قالب العرض",
    customers: "العملاء",
    owner: "المالك",
    ownerNotClaimed: "لم تتم المطالبة بالملكية",
    viewStorefront: "فتح واجهة المتجر",
    manageStore: "إدارة المتجر",
    provisioning: "إنشاء متجر",
    createStore: "إنشاء متجر إلكتروني",
    createDescription: "ينشئ مساحة تجارة مستقلة. تتحكم القوالب في العرض فقط وتبقى بيانات النشاط منفصلة.",
    storeName: "اسم المتجر",
    storeNameHint: "الاسم الذي يظهر للعملاء",
    storeNamePlaceholder: "متجر مطروح",
    storeSlug: "المعرّف المختصر",
    storeSlugHint: "يُستخدم كمعرّف داخلي للمتجر",
    storeSlugPlaceholder: "matrouh-market",
    hostname: "اسم النطاق",
    hostnameHint: "نطاق المتجر المحلي أو المخصص",
    hostnamePlaceholder: "market.localhost",
    whatsapp: "رقم واتساب المتجر",
    whatsappHint: "يستقبل طلب العميل كاملاً مع بيانات التوصيل",
    whatsappPlaceholder: "+20 128 428 9997",
    template: "القالب",
    defaultLanguage: "اللغة الافتراضية",
    currency: "العملة",
    english: "الإنجليزية",
    arabic: "العربية",
    egyptianPound: "EGP — الجنيه المصري",
    usDollar: "USD — الدولار الأمريكي",
    euro: "EUR — اليورو",
    createIndependentStore: "إنشاء متجر مستقل",
    creatingStore: "جاري إنشاء المتجر…",
    createInvalid: "أدخل اسمًا ومعرّفًا ونطاقًا صالحًا، ثم حاول مرة أخرى.",
    createConflict: "معرّف المتجر أو اسم النطاق مستخدم بالفعل. اختر قيمة أخرى.",
    createFailed: "تعذر إنشاء المتجر. حاول مرة أخرى.",
    templatesUnavailable: "لا يوجد قالب تجارة جاهز حاليًا.",
  },
} as const;

export default async function EcommercePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ createError?: string }>;
}) {
  const query = await searchParams;
  const { stores, administrator } = await loadEcommerceStores();
  const templates = await loadEcommerceTemplates();
  const locale = await dashboardLocale();
  const text = copy[locale];
  const readyVersions = templates.flatMap((template) =>
    template.versions
      .filter((version) => version.status === "ready")
      .map((version) => ({ ...version, templateName: template.name })),
  );
  const activeStoreCount = stores.filter((store) => store.status === "active").length;
  const productCount = stores.reduce((sum, store) => sum + store._count.products, 0);
  const orderCount = stores.reduce((sum, store) => sum + store._count.orders, 0);

  return (
    <div className="commerceOverviewPage">
      <header className="commerceOverviewHeader">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="sub">{text.description}</p>
        </div>
        <div className="headerActions">
          {administrator ? (
            <Link className="buttonLink secondaryButton" href="/ecommerce/templates">
              {text.browseTemplates}
            </Link>
          ) : null}
          {administrator ? (
            <a className="buttonLink" href="#new-commerce-store">
              {text.newStore}
            </a>
          ) : null}
        </div>
      </header>

      <section aria-label={text.stores} className="commerceOverviewStats">
        <article className="commerceStatCard commerceStatCard--primary">
          <span>{text.stores}</span>
          <strong>{stores.length}</strong>
        </article>
        <article className="commerceStatCard">
          <span>{text.activeStores}</span>
          <strong>{activeStoreCount}</strong>
        </article>
        <article className="commerceStatCard">
          <span>{text.products}</span>
          <strong>{productCount}</strong>
        </article>
        <article className="commerceStatCard">
          <span>{text.orders}</span>
          <strong>{orderCount}</strong>
        </article>
      </section>

      <div className={administrator ? "commerceOverviewGrid" : "commerceOverviewGrid commerceOverviewGrid--single"}>
        <section className="panel commercePortfolioPanel">
          <div className="panelHead commercePanelHead">
            <div>
              <p className="eyebrow">{text.portfolioEyebrow}</p>
              <h2>{administrator ? text.managedStores : text.yourStores}</h2>
              <p>{text.portfolioDescription}</p>
            </div>
            <span>{stores.length}</span>
          </div>

          {stores.length === 0 ? (
            <div className="commerceEmptyState">
              <strong>{text.noStores}</strong>
              <p>{text.noStoresHelp}</p>
            </div>
          ) : (
            <div className="commerceStoreGrid">
              {stores.map((store) => {
                const hostname = store.website.domains[0]?.hostnameDisplay;
                const statusLabel = text[store.status as "active" | "draft" | "paused"] ?? store.status;
                return (
                  <article className="commerceStoreCard" key={store.id}>
                    <div className="commerceStoreCardHead">
                      <div>
                        <span className={`status ${store.status}`}>{statusLabel}</span>
                        <h3>{store.name}</h3>
                        <p>{text.generalTemplate}: {store.templateVersion.template.name} · {store.templateVersion.version}</p>
                      </div>
                      <span aria-hidden="true" className="commerceStoreMark">{store.name.slice(0, 1).toUpperCase()}</span>
                    </div>

                    <dl className="commerceStoreMetrics">
                      <div><dt>{text.products}</dt><dd>{store._count.products}</dd></div>
                      <div><dt>{text.orders}</dt><dd>{store._count.orders}</dd></div>
                      <div><dt>{text.customers}</dt><dd>{store._count.customers}</dd></div>
                    </dl>

                    <div className="commerceStoreOwner">
                      <span>{text.owner}</span>
                      {store.owner ? (
                        <div><strong>{store.owner.displayName}</strong><small>{store.owner.primaryEmail}</small></div>
                      ) : <strong>{text.ownerNotClaimed}</strong>}
                    </div>

                    <div className="commerceStoreActions">
                      {hostname ? (
                        <a className="commerceStorefrontLink" href={`http://${hostname}:3000`} rel="noreferrer" target="_blank">
                          <span>{text.viewStorefront}</span><small dir="ltr">{hostname} ↗</small>
                        </a>
                      ) : <span />}
                      <Link className="buttonLink" href={`/ecommerce/stores/${store.id}`}>{text.manageStore}</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {administrator ? (
          <aside className="panel commerceCreatePanel" id="new-commerce-store">
            <div className="panelHead commercePanelHead">
              <div>
                <p className="eyebrow">{text.provisioning}</p>
                <h2>{text.createStore}</h2>
                <p>{text.createDescription}</p>
              </div>
            </div>
            <form action={createEcommerceStoreAction} className="settingsForm commerceCreateForm">
              {query.createError ? (
                <p className="commerceCreateError" role="alert">
                  {query.createError === "conflict"
                    ? text.createConflict
                    : query.createError === "invalid"
                      ? text.createInvalid
                      : text.createFailed}
                </p>
              ) : null}
              <label>
                <span>{text.storeName}</span><small>{text.storeNameHint}</small>
                <input defaultValue={text.storeNamePlaceholder} maxLength={200} name="name" required />
              </label>
              <label>
                <span>{text.storeSlug}</span><small>{text.storeSlugHint}</small>
                <input autoCapitalize="none" defaultValue={text.storeSlugPlaceholder} dir="ltr" maxLength={120} name="slug" spellCheck={false} />
              </label>
              <label>
                <span>{text.hostname}</span><small>{text.hostnameHint}</small>
                <input autoCapitalize="none" defaultValue={text.hostnamePlaceholder} dir="ltr" maxLength={253} name="hostname" spellCheck={false} />
              </label>
              <label>
                <span>{text.whatsapp}</span><small>{text.whatsappHint}</small>
                <input autoComplete="tel" defaultValue={text.whatsappPlaceholder} dir="ltr" inputMode="tel" maxLength={50} name="contactPhone" required />
              </label>
              <label>
                <span>{text.template}</span>
                <select disabled={readyVersions.length === 0} name="templateVersionId" required>
                  {readyVersions.length === 0 ? <option value="">{text.templatesUnavailable}</option> : null}
                  {readyVersions.map((version) => <option key={version.id} value={version.id}>{version.templateName} {version.version}</option>)}
                </select>
              </label>
              <div className="commerceCreateFormRow">
                <label>
                  <span>{text.defaultLanguage}</span>
                  <select defaultValue="en" name="defaultLocale"><option value="en">{text.english}</option><option value="ar">{text.arabic}</option></select>
                </label>
                <label>
                  <span>{text.currency}</span>
                  <select defaultValue="EGP" name="currency"><option value="EGP">{text.egyptianPound}</option><option value="USD">{text.usDollar}</option><option value="EUR">{text.euro}</option></select>
                </label>
              </div>
              <PendingSubmit disabled={readyVersions.length === 0} pendingLabel={text.creatingStore}>
                {text.createIndependentStore}
              </PendingSubmit>
            </form>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
