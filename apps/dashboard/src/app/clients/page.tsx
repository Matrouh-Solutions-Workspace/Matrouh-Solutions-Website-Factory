import { loadClients } from "@/server/control-data";
import { dashboardLocale, dashboardText } from "@/server/dashboard-locale";
import { archiveClientAction, updateClientAction, updateWebsiteOwnerAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; websiteCount?: string; websiteStatus?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const websiteCount = ["none", "one", "many"].includes(params.websiteCount ?? "")
    ? params.websiteCount
    : "";
  const websiteStatus = ["draft", "published", "unpublished", "disabled", "archived"].includes(
    params.websiteStatus ?? "",
  )
    ? params.websiteStatus
    : "";
  const [clients, allClients, locale] = await Promise.all([
    loadClients(query, { websiteCount, websiteStatus }),
    loadClients(),
    dashboardLocale(),
  ]);
  const t = (english: string, arabic: string) => dashboardText(locale, english, arabic);
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">{t("Accounts", "الحسابات")}</p>
          <h1>{t("Clients", "العملاء")}</h1>
          <p className="sub">
            {t(
              "Client records are created by registered account owners.",
              "تُنشأ سجلات العملاء عند تسجيل مالكي الحسابات.",
            )}
          </p>
        </div>
      </header>
      <section className="workspaceGrid">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">{t("Directory", "الدليل")}</p>
              <h2>{t("Client accounts", "حسابات العملاء")}</h2>
            </div>
            <span>{locale === "ar" ? `${clients.length} نشط` : `${clients.length} active`}</span>
          </div>
          <form className="websiteToolbar clientsToolbar" method="get">
            <label>
              <span className="srOnly">{t("Search clients", "بحث العملاء")}</span>
              <input
                defaultValue={query}
                name="q"
                placeholder={t(
                  "Search name, email, phone, or domain",
                  "ابحث بالاسم أو البريد أو الهاتف أو النطاق",
                )}
                type="search"
              />
            </label>
            <button className="secondaryButton" type="submit">
              {t("Search", "بحث")}
            </button>
            <select defaultValue={websiteCount} name="websiteCount">
              <option value="">{t("Any website count", "أي عدد من المواقع")}</option>
              <option value="none">{t("No websites", "بلا مواقع")}</option>
              <option value="one">{t("One website", "موقع واحد")}</option>
              <option value="many">{t("Multiple websites", "عدة مواقع")}</option>
            </select>
            <select defaultValue={websiteStatus} name="websiteStatus">
              <option value="">{t("Any website status", "أي حالة للموقع")}</option>
              <option value="draft">{t("Draft", "مسودة")}</option>
              <option value="published">{t("Published", "منشور")}</option>
              <option value="unpublished">{t("Unpublished", "غير منشور")}</option>
              <option value="disabled">{t("Disabled", "معطل")}</option>
            </select>
            {query && (
              <a className="textLink" href="/clients">
                {t("Clear", "مسح")}
              </a>
            )}
          </form>
          <div className="tableList clientDirectoryList">
            {clients.map((client) => (
              <details className="clientDetailCard" key={client.id}>
                <summary className="dataRow clientSummary">
                  <div className="avatar">{initials(client.name)}</div>
                  <div>
                    <strong>{client.name}</strong>
                    <p>{client.contactName || t("No contact name", "لا يوجد اسم جهة اتصال")}</p>
                  </div>
                  <div>
                    <strong>
                      {client.contactEmail ||
                        client.contactPhone ||
                        t("No contact details", "لا توجد بيانات تواصل")}
                    </strong>
                    <p>
                      {locale === "ar"
                        ? `${client.websites.length} موقع مُدار · ${client._count.outboundMessages} رسالة`
                        : `${client.websites.length} managed website${client.websites.length === 1 ? "" : "s"} · ${client._count.outboundMessages} messages`}
                    </p>
                  </div>
                  <span className="status active">{t("View details", "عرض التفاصيل")}</span>
                </summary>
                <div className="clientDetailBody">
                  <div className="clientDetailStats">
                    <span>
                      <b>{client.websites.length}</b>
                      {t("Websites", "مواقع")}
                    </span>
                    <span>
                      <b>{client._count.subscriptions}</b>
                      {t("Subscriptions", "اشتراكات")}
                    </span>
                    <span>
                      <b>{client._count.outboundMessages}</b>
                      {t("Messages", "رسائل")}
                    </span>
                    <span>
                      <b>{formatDate(client.createdAt, locale)}</b>
                      {t("Joined", "تاريخ الانضمام")}
                    </span>
                  </div>
                  <form action={updateClientAction} className="clientEditForm">
                    <input name="clientId" type="hidden" value={client.id} />
                    <label>
                      {t("Account name", "اسم الحساب")}
                      <input defaultValue={client.name} name="name" required />
                    </label>
                    <label>
                      {t("Contact name", "اسم جهة الاتصال")}
                      <input defaultValue={client.contactName ?? ""} name="contactName" />
                    </label>
                    <label>
                      {t("Email", "البريد الإلكتروني")}
                      <input
                        defaultValue={client.contactEmail ?? ""}
                        name="contactEmail"
                        type="email"
                      />
                    </label>
                    <label>
                      {t("Phone", "الهاتف")}
                      <input defaultValue={client.contactPhone ?? ""} name="contactPhone" />
                    </label>
                    <label className="clientNotesField">
                      {t("Internal notes", "ملاحظات داخلية")}
                      <textarea defaultValue={client.notes ?? ""} name="notes" rows={3} />
                    </label>
                    <button className="buttonLink" type="submit">
                      {t("Save client", "حفظ العميل")}
                    </button>
                  </form>
                  <div className="clientWebsitesDetail">
                    <h3>{t("Managed websites and ownership", "المواقع المُدارة والملكية")}</h3>
                    {client.websites.length === 0 ? (
                      <p>{t("No active websites assigned.", "لا توجد مواقع نشطة مُسندة.")}</p>
                    ) : (
                      client.websites.map((website) => (
                        <div className="clientWebsiteDetail" key={website.id}>
                          <div>
                            <strong>{website.name}</strong>
                            <p>
                              {website.domains
                                .map((domain) => domain.hostnameNormalized)
                                .join(" · ") || website.templateId}
                            </p>
                          </div>
                          <form action={updateWebsiteOwnerAction} className="ownerChangeForm">
                            <input name="websiteId" type="hidden" value={website.id} />
                            <label className="srOnly" htmlFor={`owner-${website.id}`}>
                              {t("Website owner", "مالك الموقع")}
                            </label>
                            <select
                              defaultValue={client.id}
                              id={`owner-${website.id}`}
                              name="clientId"
                            >
                              <option value="">{t("No owner", "بلا مالك")}</option>
                              {allClients.map((owner) => (
                                <option key={owner.id} value={owner.id}>
                                  {owner.name} · {owner.contactEmail || "—"}
                                </option>
                              ))}
                            </select>
                            <button className="secondaryButton" type="submit">
                              {t("Change owner", "تغيير المالك")}
                            </button>
                          </form>
                        </div>
                      ))
                    )}
                  </div>
                  <form action={archiveClientAction} className="clientArchiveForm">
                    <input name="clientId" type="hidden" value={client.id} />
                    <button className="dangerButton" type="submit">
                      {t("Archive client and release websites", "أرشفة العميل وتحرير المواقع")}
                    </button>
                    <small>
                      {t(
                        "This keeps the record recoverable and removes ownership from its websites.",
                        "يحتفظ هذا بالسجل قابلاً للاستعادة ويزيل ملكية المواقع منه.",
                      )}
                    </small>
                  </form>
                </div>
              </details>
            ))}
          </div>
          {clients.length === 0 && (
            <div className="emptyState">
              <strong>{t("No client accounts yet", "لا توجد حسابات عملاء بعد")}</strong>
              <p>
                {t(
                  "Clients appear after an account claims a website.",
                  "يظهر العملاء بعد أن يطالب الحساب بملكية موقع.",
                )}
              </p>
            </div>
          )}
        </div>
        <section className="panel createPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">{t("Account ownership", "ملكية الحساب")}</p>
              <h2>{t("Clients come from accounts", "العملاء مرتبطون بالحسابات")}</h2>
            </div>
          </div>
          <p className="formNotice">
            {t(
              "Create an ownerless website and send its claim link. After the recipient registers or signs in and claims it, their account appears here automatically.",
              "أنشئ موقعًا بلا مالك وأرسل رابط المطالبة. بعد أن يسجل المستلم أو يسجل الدخول ويطالب به، يظهر حسابه هنا تلقائيًا.",
            )}
          </p>
          <a className="buttonLink" href="/websites#create-website">
            {t("Create ownerless website", "إنشاء موقع بلا مالك")}
          </a>
        </section>
      </section>
    </>
  );
}

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

function initials(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
