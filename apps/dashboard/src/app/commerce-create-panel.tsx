import { createEcommerceStoreAction } from "@/app/ecommerce/actions";
import { PendingSubmit } from "@/app/pending-submit";

interface CommerceCreatePanelProps {
  readonly locale: "ar" | "en";
  readonly error?: string | undefined;
  readonly hostnameRoot: string;
  readonly hostingDomainId?: string | undefined;
  readonly templates: readonly { id: string; name: string; version: string }[];
}

export function CommerceCreatePanel({
  locale,
  error,
  hostnameRoot,
  hostingDomainId,
  templates,
}: CommerceCreatePanelProps) {
  const ar = locale === "ar";
  return (
    <section className="panel createPanel commerceCreatePanel" id="new-commerce-store">
      <div className="panelHead">
        <div>
          <p className="eyebrow">{ar ? "نظام التجارة" : "Commerce system"}</p>
          <h2>{ar ? "إنشاء متجر إلكتروني" : "Create e-commerce store"}</h2>
          <p className="sub">
            {ar
              ? "مساحة مستقلة للمنتجات والطلبات والعملاء؛ القالب يتحكم في العرض فقط."
              : "A separate workspace for products, orders, and customers. The template controls its presentation."}
          </p>
        </div>
        <a className="textLink" href="/templates#ecommerce-templates">
          {ar ? "استعراض قوالب المتاجر" : "Browse store templates"}
        </a>
      </div>
      <form action={createEcommerceStoreAction} className="settingsForm commerceCreateForm">
        {error ? (
          <p className="commerceCreateError" role="alert">
            {error === "conflict"
              ? ar
                ? "اسم المتجر أو النطاق مستخدم بالفعل."
                : "That store slug or hostname is already in use."
              : ar
                ? "تحقق من البيانات وحاول مرة أخرى."
                : "Check the store details and try again."}
          </p>
        ) : null}
        <label>
          <span>{ar ? "اسم المتجر" : "Store name"}</span>
          <input
            maxLength={200}
            name="name"
            placeholder={ar ? "متجر مطروح" : "Matrouh Market"}
            required
          />
        </label>
        <label>
          <span>{ar ? "المعرّف المختصر" : "Store slug"}</span>
          <input
            autoCapitalize="none"
            dir="ltr"
            maxLength={120}
            name="slug"
            placeholder="matrouh-market"
            spellCheck={false}
          />
        </label>
        <label>
          <span>{ar ? "النطاق الفرعي" : "Hostname"}</span>
          <small>
            {ar ? "اتركه فارغاً لاستخدام معرّف المتجر." : "Leave blank to use the store slug."}
          </small>
          <input
            autoCapitalize="none"
            dir="ltr"
            maxLength={253}
            name="hostname"
            placeholder={`market.${hostnameRoot}`}
            spellCheck={false}
          />
        </label>
        {hostingDomainId ? (
          <input name="hostingDomainId" type="hidden" value={hostingDomainId} />
        ) : null}
        <label>
          <span>{ar ? "رقم واتساب المتجر" : "Store WhatsApp number"}</span>
          <input
            autoComplete="tel"
            dir="ltr"
            inputMode="tel"
            maxLength={50}
            name="contactPhone"
            placeholder="+20 100 000 0000"
            required
          />
        </label>
        <label>
          <span>{ar ? "قالب المتجر" : "Storefront template"}</span>
          <select disabled={templates.length === 0} name="templateVersionId" required>
            {templates.length === 0 ? (
              <option value="">{ar ? "لا يوجد قالب جاهز" : "No ready commerce template"}</option>
            ) : null}
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.version}
              </option>
            ))}
          </select>
        </label>
        <div className="commerceCreateFormRow">
          <label>
            <span>{ar ? "اللغة الافتراضية" : "Default language"}</span>
            <select defaultValue="en" name="defaultLocale">
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <label>
            <span>{ar ? "العملة" : "Currency"}</span>
            <select defaultValue="EGP" name="currency">
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
        </div>
        <PendingSubmit
          disabled={templates.length === 0}
          pendingLabel={ar ? "جارٍ إنشاء المتجر…" : "Creating store…"}
        >
          {ar ? "إنشاء متجر" : "Create store"}
        </PendingSubmit>
      </form>
    </section>
  );
}
