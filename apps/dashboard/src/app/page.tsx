import { join } from "node:path";
import type { CSSProperties } from "react";
import { discoverTemplates } from "@factory/template-loader";
import { previewWebsiteAction, toggleWebsitePublicationAction } from "@/app/actions";
import { Icon, type IconName } from "@/app/icons";
import { PendingSubmit } from "@/app/pending-submit";
import { PaginatedOverviewList } from "@/app/numbered-pagination";
import { PublicationStatusRefresh } from "@/app/publication-status-refresh";
import { loadEcommerceStores } from "@/server/ecommerce";
import { loadDashboardOverview } from "@/server/overview";
import { dashboardLocale } from "@/server/dashboard-locale";
import { isActivePublicationJob } from "@/server/publication-jobs";

export const dynamic = "force-dynamic";

async function templateCatalog() {
  try {
    return await discoverTemplates(join(process.cwd(), "..", "..", "templates"));
  } catch {
    return [];
  }
}

export default async function Dashboard() {
  const [templates, overview, locale, commerce] = await Promise.all([
    templateCatalog(),
    loadDashboardOverview(),
    dashboardLocale(),
    loadEcommerceStores(),
  ]);
  const text = dashboardCopy(locale);
  const websites = overview.websites;
  const commerceStoreByWebsiteId = new Map(
    commerce.stores.map((store) => [store.websiteId, store] as const),
  );
  const hasActivePublication = websites.some((website) =>
    isActivePublicationJob(website.latestPublishJob?.status),
  );
  const catalog = overview.templates.length
    ? overview.templates
    : templates.map(({ discovery }) => ({
        templateId: discovery.templateId,
        displayName: discovery.templateId.split(".").at(-1) ?? discovery.templateId,
        category: "Template",
        lifecycleStatus: "ready",
        latestVersion: discovery.templateVersion,
      }));
  const statCards = [
    {
      label: "Websites",
      value: String(overview.stats.websites || websites.length),
      note: text.publishedCount(overview.stats.publishedWebsites),
      icon: "websites",
    },
    {
      label: "Templates",
      value: String(overview.stats.templates || catalog.length),
      note: text.validatedCatalog,
      icon: "templates",
    },
    {
      label: "Domains",
      value: String(overview.stats.activeDomains),
      note: text.activeHostnames,
      icon: "domains",
    },
    {
      label: "Publish jobs",
      value: String(overview.stats.activePublishJobs),
      note: text.failedCount(overview.stats.failedPublishJobs),
      icon: "monitoring",
    },
  ] satisfies readonly { label: string; value: string; note: string; icon: IconName }[];

  return (
    <>
      <PublicationStatusRefresh active={hasActivePublication} />
      <header className="overviewHero">
        <div>
          <div className="overviewMeta">
            <p className="eyebrow">{headerDate(locale)}</p>
            <span>
              <i /> Live workspace
            </span>
          </div>
          <h1>{overview.organization?.name ?? "Website Factory"}</h1>
          <p className="sub">A clear view of your websites, delivery status, and recent work.</p>
        </div>
        <a className="buttonLink" href="#create-website">
          Create website
        </a>
      </header>
      <section className="stats">
        {statCards.map(({ label, value, note, icon }, index) => (
          <article key={label} style={{ "--stat-index": index } as CSSProperties}>
            <div className="statHead">
              <p>{label}</p>
              <span>
                <Icon name={icon} />
              </span>
            </div>
            <div className="statValue">
              <strong>{value}</strong>
              <small>{note}</small>
            </div>
          </article>
        ))}
      </section>
      <section aria-label="Quick actions" className="quickRail">
        <div>
          <span>
            <Icon name="spark" />
          </span>
          <p>
            <strong>Move your workspace forward</strong>
            <small>Jump directly to the tools you use most.</small>
          </p>
        </div>
        <nav>
          <a href="/dashboard/websites">
            Websites <b>↗</b>
          </a>
          <a href="/dashboard/templates">
            Templates <b>↗</b>
          </a>
          <a href="/dashboard/domains">
            Domains <b>↗</b>
          </a>
          <a href="/dashboard/monitoring">
            System health <b>↗</b>
          </a>
        </nav>
      </section>
      <section className="workspaceGrid overviewWorkspace">
        <div className="panel portfolioPanel overviewPortfolioPanel" id="overview-websites">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2>Recent websites</h2>
            </div>
            <span>{websites.length} total</span>
          </div>
          <PaginatedOverviewList
            itemLabel={locale === "ar" ? "مواقع" : "websites"}
            items={websites.map((website, index) => {
              const commerceStore = commerceStoreByWebsiteId.get(website.id);
              const commerceWebsite =
                Boolean(commerceStore) || website.templateId.startsWith("ecommerce:");
              const editHref = commerceWebsite
                ? commerceStore
                  ? `/ecommerce/stores/${commerceStore.id}`
                  : "/ecommerce"
                : `/websites/${website.id}`;
              return (
                <div className="website overviewWebsiteRow" key={website.id}>
                  <div className={`thumb t${index % 2}`}>{initials(website.name)}</div>
                  <div className="overviewWebsiteIdentity">
                    <span
                      className={`overviewTypeBadge ${commerceWebsite ? "isCommerce" : "isTemplate"}`}
                    >
                      {commerceWebsite ? "E-commerce" : "Website"}
                    </span>
                    <strong>{website.name}</strong>
                    <p>
                      {website.domains[0]?.hostname ?? "No domain"} | {website.templateVersion} |{" "}
                      {text.pageCount(website.pages)}
                    </p>
                  </div>
                  <div className="statusStack">
                    <span className="status">{text.status(website.status)}</span>
                    {website.pendingUpdate && (
                      <span className="jobStatus retryable">pending update</span>
                    )}
                    {website.latestPublishJob && (
                      <span className={`jobStatus ${website.latestPublishJob.status}`}>
                        {text.status(website.latestPublishJob.status)}
                      </span>
                    )}
                  </div>
                  <div className="rowActions">
                    <a className="overviewEditAction" href={editHref}>
                      {commerceWebsite ? "Manage store" : "Edit website"}
                    </a>
                    {website.domains[0] && (
                      <a
                        href={publicWebsiteUrl(website.domains[0].hostname)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open
                      </a>
                    )}
                    <form action={toggleWebsitePublicationAction}>
                      <input name="websiteId" type="hidden" value={website.id} />
                      <PendingSubmit
                        className="inlineButton"
                        disabled={
                          isActivePublicationJob(website.latestPublishJob?.status) ||
                          (website.status === "published" && !website.pendingUpdate)
                        }
                        pendingLabel={website.pendingUpdate ? "Publishing update…" : "Publishing…"}
                      >
                        {isActivePublicationJob(website.latestPublishJob?.status)
                          ? "Publish queued"
                          : website.pendingUpdate
                            ? "Publish update"
                            : website.status === "published"
                              ? "Published"
                              : "Publish"}
                      </PendingSubmit>
                    </form>
                    <form action={previewWebsiteAction}>
                      <input name="websiteId" type="hidden" value={website.id} />
                      <PendingSubmit className="inlineButton" pendingLabel="Preparing…">
                        Preview
                      </PendingSubmit>
                    </form>
                    <small>{relativeDate(website.updatedAt, locale)}</small>
                  </div>
                </div>
              );
            })}
            label={locale === "ar" ? "صفحات أحدث المواقع" : "Recent website pages"}
            locale={locale}
            scrollTargetId="overview-websites"
          />
          {websites.length === 0 && (
            <div className="emptyState">
              <strong>No websites yet</strong>
              <p>Create your first draft from a validated template.</p>
            </div>
          )}
        </div>
        <div className="panel catalogPanel" id="overview-templates">
          <div className="panelHead">
            <div>
              <p className="eyebrow">SDK catalog</p>
              <h2>Templates</h2>
            </div>
          </div>
          <PaginatedOverviewList
            itemLabel={locale === "ar" ? "قوالب" : "templates"}
            items={catalog.map((template) => (
              <div className="template" key={template.templateId}>
                <div className="templateIcon">
                  <Icon name="templates" />
                </div>
                <div>
                  <strong>{template.displayName}</strong>
                  <p>
                    {template.latestVersion ?? "No version"} | {template.category}
                  </p>
                </div>
                <span>{text.status(template.lifecycleStatus)}</span>
              </div>
            ))}
            label={locale === "ar" ? "صفحات القوالب" : "Template pages"}
            locale={locale}
            scrollTargetId="overview-templates"
          />
          {catalog.length === 0 && (
            <p className="empty">Run pnpm seed:demo to populate the catalog.</p>
          )}
        </div>
        <div className="panel operationsPanel" id="overview-publish-jobs">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Publish queue</h2>
            </div>
            <span>{overview.publishJobs.length} recent</span>
          </div>
          <PaginatedOverviewList
            itemLabel={locale === "ar" ? "مهام" : "jobs"}
            items={overview.publishJobs.map((job) => (
              <div className="jobRow" key={job.id}>
                <div>
                  <strong>{text.status(job.status)}</strong>
                  <p>
                    {shortId(job.websiteId)} | {text.attempt(job.attemptCount, job.maxAttempts)}
                  </p>
                </div>
                <small>{relativeDate(job.completedAt ?? job.createdAt, locale)}</small>
              </div>
            ))}
            label={locale === "ar" ? "صفحات مهام النشر" : "Publish job pages"}
            locale={locale}
            scrollTargetId="overview-publish-jobs"
          />
          {overview.publishJobs.length === 0 && (
            <p className="empty">Publish jobs appear here after you press Publish.</p>
          )}
        </div>
        <section className="panel createPanel" id="create-website">
          <div className="panelHead">
            <div>
              <p className="eyebrow">New website</p>
              <h2>Create from template</h2>
            </div>
          </div>
          <p>
            Use the guided setup to choose a template, verify the exact subdomain, select languages,
            and configure billing.
          </p>
          <a className="buttonLink" href="/websites#create-website">
            Open website setup
          </a>
        </section>
      </section>
    </>
  );
}

function headerDate(locale: "ar" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function dashboardCopy(locale: "ar" | "en") {
  const statusCopy: Readonly<Record<string, string>> =
    locale === "ar"
      ? {
          archived: "مؤرشف",
          disabled: "معطل",
          draft: "مسودة",
          failed: "فشل",
          published: "منشور",
          queued: "في الانتظار",
          ready: "جاهز",
          retryable: "قابل لإعادة المحاولة",
          running: "قيد التنفيذ",
          succeeded: "نجح",
          unpublished: "غير منشور",
        }
      : {};
  return {
    activeHostnames: locale === "ar" ? "أسماء النطاقات النشطة" : "Active hostnames",
    attempt: (count: number, max: number) =>
      locale === "ar" ? `محاولة ${count}/${max}` : `attempt ${count}/${max}`,
    failedCount: (count: number) => (locale === "ar" ? `${count} فاشلة` : `${count} failed`),
    pageCount: (count: number) =>
      locale === "ar" ? `${count} صفحة` : `${count} page${count === 1 ? "" : "s"}`,
    publishedCount: (count: number) => (locale === "ar" ? `${count} منشورة` : `${count} published`),
    status: (value: string) => statusCopy[value] ?? value,
    validatedCatalog: locale === "ar" ? "كتالوج موثّق" : "Validated catalog",
  };
}

function shortId(value: string): string {
  return value.slice(0, 8);
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

function publicWebsiteUrl(hostname: string): string {
  return hostname === "localhost" || hostname.endsWith(".localhost")
    ? `http://${hostname}:3000`
    : `https://${hostname}`;
}

function relativeDate(value: Date, locale: "ar" | "en"): string {
  const formatter = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-EG" : "en", {
    numeric: "auto",
  });
  const seconds = Math.round((value.getTime() - Date.now()) / 1000);
  const units: readonly [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return locale === "ar" ? "الآن" : "just now";
}
