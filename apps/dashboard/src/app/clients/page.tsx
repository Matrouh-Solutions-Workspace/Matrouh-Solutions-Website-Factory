import { loadClients } from "@/server/control-data";
import { dashboardLocale, dashboardText } from "@/server/dashboard-locale";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const [clients, locale] = await Promise.all([loadClients(query), dashboardLocale()]);
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
          <form className="websiteToolbar" method="get">
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
            {query && (
              <a className="textLink" href="/clients">
                {t("Clear", "مسح")}
              </a>
            )}
          </form>
          <div className="tableList">
            {clients.map((client) => (
              <article className="dataRow" key={client.id}>
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
                      ? `${client._count.websites} موقع مُدار`
                      : `${client._count.websites} managed website${client._count.websites === 1 ? "" : "s"}`}
                  </p>
                </div>
                <span className="status active">{t("Account client", "عميل الحساب")}</span>
              </article>
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

function initials(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
