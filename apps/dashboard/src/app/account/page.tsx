import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { loadClientAccount } from "@/server/control-data";
import { UI_LOCALE_COOKIE, uiLocale } from "@/server/ui-locale";

export const dynamic = "force-dynamic";

export default async function ClientAccountPage() {
  const { clients, actor, organization } = await loadClientAccount();
  if (clients.length === 0) notFound();
  const locale = uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  const copy = locale === "ar" ? arabic : english;

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">{copy.clientDashboard}</p>
          <h1>
            {copy.welcome}
            {locale === "ar" ? "، " : ", "}
            {actor.displayName}
          </h1>
          <p className="sub">{copy.intro.replace("{organization}", organization.name)}</p>
        </div>
      </header>
      {clients.map((client) => (
        <section className="panel" key={client.id}>
          <div className="panelHead">
            <div>
              <p className="eyebrow">{copy.account}</p>
              <h2>{client.name}</h2>
            </div>
            <span>{copy.websiteCount.replace("{count}", String(client.websites.length))}</span>
          </div>
          <div className="tableList">
            {client.websites.map((website) => (
              <article className="dataRow" key={website.id}>
                <div>
                  <strong>{website.name}</strong>
                  <p>{website.domains[0]?.hostnameNormalized ?? copy.domainPending}</p>
                </div>
                <div>
                  <strong>{planLabel(website.subscription?.cadence, locale)}</strong>
                  <p>
                    {website.subscription
                      ? `${copy.expires} ${website.subscription.expiresAt.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}`
                      : copy.contactSupport}
                  </p>
                </div>
                <div>
                  <strong>{copy.websiteStatus.replace("{status}", website.status)}</strong>
                  <p>
                    {copy.planStatus.replace(
                      "{status}",
                      website.subscription?.status ?? copy.notConfigured,
                    )}
                  </p>
                </div>
                <a className="buttonLink secondaryButton" href={`/account/websites/${website.id}`}>
                  {copy.manageWebsite}
                </a>
              </article>
            ))}
          </div>
          {client.websites.length === 0 && (
            <div className="emptyState">
              <strong>{copy.noWebsites}</strong>
              <p>{copy.noWebsitesDescription}</p>
            </div>
          )}
        </section>
      ))}
    </>
  );
}

function planLabel(
  cadence: "trial" | "monthly" | "yearly" | undefined,
  locale: "ar" | "en",
): string {
  if (locale === "ar") {
    if (cadence === "trial") return "تجريبي";
    if (cadence === "monthly") return "خطة شهرية";
    if (cadence === "yearly") return "خطة سنوية";
    return "لا توجد خطة نشطة";
  }
  if (cadence === "trial") return "Trial";
  if (cadence === "monthly") return "Monthly plan";
  if (cadence === "yearly") return "Yearly plan";
  return "No active plan";
}

const english = {
  clientDashboard: "Client dashboard",
  welcome: "Welcome",
  intro: "Your websites and subscription information with {organization}.",
  account: "Account",
  websiteCount: "{count} websites",
  domainPending: "Domain pending",
  expires: "Expires",
  contactSupport: "Contact support for billing",
  websiteStatus: "Website: {status}",
  planStatus: "Plan: {status}",
  notConfigured: "not configured",
  manageWebsite: "Manage website",
  noWebsites: "No websites assigned",
  noWebsitesDescription: "Contact support if you expected a website here.",
} as const;

const arabic: Record<keyof typeof english, string> = {
  clientDashboard: "لوحة العميل",
  welcome: "مرحبًا",
  intro: "مواقعك ومعلومات اشتراكاتك لدى {organization}.",
  account: "الحساب",
  websiteCount: "{count} مواقع",
  domainPending: "النطاق قيد التجهيز",
  expires: "ينتهي في",
  contactSupport: "تواصل مع الدعم بخصوص الفوترة",
  websiteStatus: "حالة الموقع: {status}",
  planStatus: "الخطة: {status}",
  notConfigured: "غير مهيأة",
  manageWebsite: "إدارة الموقع",
  noWebsites: "لا توجد مواقع مخصصة",
  noWebsitesDescription: "تواصل مع الدعم إذا كنت تتوقع وجود موقع هنا.",
};
