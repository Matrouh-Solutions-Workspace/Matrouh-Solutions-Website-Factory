import {
  deleteWebsiteAction,
  previewWebsiteAction,
  restartWorkerAction,
  retryPublicationJobAction,
  setWebsiteAvailabilityAction,
  toggleWebsitePublicationAction,
} from "@/app/actions";
import { ConfirmSubmit } from "@/app/confirm-submit";
import { PendingSubmit } from "@/app/pending-submit";
import { loadDashboardOverview } from "@/server/overview";
import { WebsiteCreateWizard } from "@/app/website-create-wizard";
import { canRetryPublicationJob, isActivePublicationJob } from "@/server/publication-jobs";
import { PublicationStatusRefresh } from "@/app/publication-status-refresh";
import { loadHostingDomainChoices } from "@/server/control-data";
import { loadEcommerceStores } from "@/server/ecommerce";
import { loadEcommerceTemplates } from "@/server/ecommerce";
import { dashboardLocale } from "@/server/dashboard-locale";
import { dashboardConfig } from "@/server/config";
import { CommerceCreatePanel } from "@/app/commerce-create-panel";
import { EcommerceStoreDeleteAction } from "@/app/ecommerce-store-delete-action";
import {
  WebsiteInventory,
  WebsiteInventoryGroup,
  WebsiteInventoryItem,
  type InventoryEntry,
} from "@/app/website-inventory";
import { WebsiteCreationSwitcher } from "@/app/website-creation-switcher";
import { PaginatedPublishJobs } from "@/app/numbered-pagination";

export const dynamic = "force-dynamic";

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    createError?: string;
    hostname?: string;
    workerRestart?: string;
    template?: string;
    type?: string;
    create?: string;
  }>;
}) {
  const [overview, hostingDomains, commerce, commerceTemplates, locale] = await Promise.all([
    loadDashboardOverview(),
    loadHostingDomainChoices(),
    loadEcommerceStores(),
    loadEcommerceTemplates(),
    dashboardLocale(),
  ]);
  const filters = await searchParams;
  const templateById = new Map(
    overview.templates.map((template) => [template.templateId, template]),
  );
  const categories = [
    ...new Set(overview.templates.map((template) => template.category || "Other")),
  ].sort();
  const validTypes = new Set([
    "all",
    "commerce",
    "website",
    ...categories.map((category) => `category:${category}`),
  ]);
  const type = filters.type && validTypes.has(filters.type) ? filters.type : "all";
  const status = ["all", "live", "draft", "paused", "unpublished", "disabled"].includes(
    filters.status ?? "",
  )
    ? filters.status!
    : filters.status === "published" || filters.status === "active"
      ? "live"
      : "all";
  const websites = overview.websites.filter(
    (website) => !website.templateId.startsWith("ecommerce:"),
  );
  const stores = commerce.stores;
  const inventoryEntries: InventoryEntry[] = [
    ...websites.map((website) => ({
      id: website.id,
      name: website.name,
      hostname: website.domains.map((domain) => domain.hostname).join(" "),
      status: website.status,
      category: templateById.get(website.templateId)?.category || "Other",
      system: "website" as const,
    })),
    ...stores.map((store) => ({
      id: store.id,
      name: store.name,
      hostname: store.website.domains.map((domain) => domain.hostnameDisplay).join(" "),
      status: store.status,
      category: "E-commerce",
      system: "commerce" as const,
    })),
  ];
  const inventoryById = new Map(inventoryEntries.map((entry) => [entry.id, entry]));
  const websiteGroups = [
    ...new Set(
      websites.map((website) => templateById.get(website.templateId)?.category || "Other"),
    ),
  ]
    .sort()
    .map((category) => ({
      category,
      websites: websites.filter(
        (website) => (templateById.get(website.templateId)?.category || "Other") === category,
      ),
    }));
  const createCommerce =
    filters.create === "commerce" ||
    filters.createError === "conflict" ||
    filters.createError === "invalid" ||
    filters.createError === "failed";
  const readyCommerceTemplates = commerceTemplates.flatMap((template) =>
    template.versions
      .filter((version) => version.status === "ready")
      .map((version) => ({ id: version.id, name: template.name, version: version.version })),
  );
  const defaultHostingDomain =
    hostingDomains.find((domain) => domain.isDefault) ?? hostingDomains[0];
  const hostnameRoot =
    defaultHostingDomain?.hostnameNormalized ??
    new URL(dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL).hostname;
  const templateWebsites = overview.websites.filter(
    (website) => !website.templateId.startsWith("ecommerce:"),
  );
  const hasActivePublication = overview.websites.some((website) =>
    isActivePublicationJob(website.latestPublishJob?.status),
  );
  const publishedWebsiteCount =
    templateWebsites.filter((website) => website.status === "published").length +
    commerce.stores.filter((store) => store.status === "active").length;
  const draftWebsiteCount =
    templateWebsites.filter((website) => website.status === "draft").length +
    commerce.stores.filter((store) => store.status === "draft").length;
  const pendingUpdateCount = templateWebsites.filter((website) => website.pendingUpdate).length;
  return (
    <>
      <PublicationStatusRefresh active={hasActivePublication} />
      <header>
        <div>
          <p className="eyebrow">Factory output</p>
          <h1>Websites</h1>
          <p className="sub">
            All customer sites in one place. Manage each through its own specialist workspace.
          </p>
        </div>
        <a className="buttonLink" href="#create-workspace">
          Create a website or store
        </a>
      </header>
      <section aria-label="Website overview" className="websiteSummary">
        <article>
          <span>All websites</span>
          <strong>{templateWebsites.length + commerce.stores.length}</strong>
        </article>
        <article>
          <span>Live</span>
          <strong>{publishedWebsiteCount}</strong>
        </article>
        <article>
          <span>Drafts</span>
          <strong>{draftWebsiteCount}</strong>
        </article>
        <article>
          <span>Updates waiting</span>
          <strong>{pendingUpdateCount}</strong>
        </article>
      </section>
      <section className="workspaceGrid websitesWorkspace">
        <div className="panel websiteInventoryPanel" id="website-inventory">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>Managed websites</h2>
            </div>
            <span>{inventoryEntries.length} total</span>
          </div>
          <WebsiteInventory
            categories={categories}
            entries={inventoryEntries}
            initialQuery={filters.q ?? ""}
            initialStatus={status}
            initialType={type}
            locale={locale}
          >
            {websiteGroups.map((group) => (
              <WebsiteInventoryGroup
                entries={group.websites.map((website) => inventoryById.get(website.id)!)}
                key={group.category}
                label="Template websites"
                title={group.category}
              >
                {group.websites.map((website) => (
                  <WebsiteInventoryItem entry={inventoryById.get(website.id)!} key={website.id}>
                    <div className="website" key={website.id}>
                      <div className="thumb">{initials(website.name)}</div>
                      <div className="websiteIdentity">
                        <strong>{website.name}</strong>
                        <p>
                          {templateById.get(website.templateId)?.displayName ?? website.templateId}{" "}
                          | {website.templateVersion} | {website.pages} page
                          {website.pages === 1 ? "" : "s"}
                        </p>
                        {website.domains[0] && (
                          <a
                            className="websiteDomain"
                            href={publicWebsiteUrl(website.domains[0].hostname)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {website.domains[0].hostname}
                          </a>
                        )}
                      </div>
                      <div className="statusStack">
                        <span className="status">{website.status}</span>
                        {website.pendingUpdate && (
                          <span className="jobStatus retryable">pending update</span>
                        )}
                        {website.latestPublishJob && (
                          <span className={`jobStatus ${website.latestPublishJob.status}`}>
                            {website.latestPublishJob.status}
                          </span>
                        )}
                      </div>
                      <div className="rowActions websiteActions">
                        <div className="websitePrimaryActions">
                          <a className="websiteEditAction" href={`/websites/${website.id}`}>
                            Edit site
                          </a>
                          <form action={previewWebsiteAction}>
                            <input name="websiteId" type="hidden" value={website.id} />
                            <PendingSubmit className="inlineButton" pendingLabel="Preparing…">
                              Preview
                            </PendingSubmit>
                          </form>
                          <form action={toggleWebsitePublicationAction}>
                            <input name="websiteId" type="hidden" value={website.id} />
                            <PendingSubmit
                              className="inlineButton"
                              disabled={
                                isActivePublicationJob(website.latestPublishJob?.status) ||
                                (website.status === "published" && !website.pendingUpdate)
                              }
                              pendingLabel={
                                website.pendingUpdate ? "Publishing update…" : "Publishing…"
                              }
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
                        </div>
                        <div className="websiteSecondaryActions">
                          {website.status === "published" && (
                            <form action={setWebsiteAvailabilityAction}>
                              <input name="websiteId" type="hidden" value={website.id} />
                              <input name="status" type="hidden" value="unpublished" />
                              <ConfirmSubmit
                                className="inlineButton dangerButton"
                                confirmation={`Unpublish “${website.name}”? The current live version will stop receiving public traffic.`}
                                pendingLabel="Unpublishing…"
                              >
                                Unpublish
                              </ConfirmSubmit>
                            </form>
                          )}
                          {website.status !== "disabled" && (
                            <form action={setWebsiteAvailabilityAction}>
                              <input name="websiteId" type="hidden" value={website.id} />
                              <input name="status" type="hidden" value="disabled" />
                              <ConfirmSubmit
                                className="inlineButton dangerButton"
                                confirmation={`Disable “${website.name}”? It will be removed from public traffic immediately.`}
                                pendingLabel="Disabling…"
                              >
                                Disable
                              </ConfirmSubmit>
                            </form>
                          )}
                          <form action={deleteWebsiteAction}>
                            <input name="websiteId" type="hidden" value={website.id} />
                            <ConfirmSubmit
                              className="inlineButton dangerButton"
                              confirmation={`Delete “${website.name}” permanently? Its domains, drafts, previews, and publication history will also be deleted. This cannot be undone.`}
                              pendingLabel="Deleting…"
                            >
                              Delete
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </div>
                    </div>
                  </WebsiteInventoryItem>
                ))}
              </WebsiteInventoryGroup>
            ))}
            {stores.length > 0 ? (
              <WebsiteInventoryGroup
                entries={stores.map((store) => inventoryById.get(store.id)!)}
                label="Commerce system"
                title="E-commerce stores"
              >
                <div className="unifiedCommerceRows">
                  {stores.map((store) => {
                    const hostname = store.website.domains[0]?.hostnameDisplay;
                    return (
                      <WebsiteInventoryItem entry={inventoryById.get(store.id)!} key={store.id}>
                        <div className="unifiedCommerceRow" key={store.id}>
                          <div className="thumb">{initials(store.name)}</div>
                          <div className="websiteIdentity">
                            <strong>{store.name}</strong>
                            <p>
                              E-commerce · {store.templateVersion.template.name}{" "}
                              {store.templateVersion.version}
                            </p>
                            <small className="unifiedStoreOwner">
                              {store.owner
                                ? `Owner: ${store.owner.displayName}`
                                : "Owner not claimed"}
                            </small>
                            {hostname ? (
                              <a
                                className="websiteDomain"
                                href={publicWebsiteUrl(hostname)}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {hostname}
                              </a>
                            ) : null}
                          </div>
                          <div className="unifiedCommerceMetrics">
                            <span>
                              <b>{store._count.products}</b> products
                            </span>
                            <span>
                              <b>{store._count.orders}</b> orders
                            </span>
                            <span>
                              <b>{store._count.customers}</b> customers
                            </span>
                          </div>
                          <span className={`status ${store.status}`}>{store.status}</span>
                          <div className="rowActions">
                            <a className="websiteEditAction" href={`/ecommerce/stores/${store.id}`}>
                              Manage store
                            </a>
                            {commerce.administrator ? (
                              <EcommerceStoreDeleteAction
                                confirmation={
                                  'Delete "{name}"? Its storefront and hostname will be released. Commerce records remain recoverable.'
                                }
                                label="Delete store"
                                pendingLabel="Deleting…"
                                storeId={store.id}
                                storeName={store.name}
                              />
                            ) : null}
                          </div>
                        </div>
                      </WebsiteInventoryItem>
                    );
                  })}
                </div>
              </WebsiteInventoryGroup>
            ) : null}
          </WebsiteInventory>
        </div>
        <div className="panel publishJobsPanel" id="publish-jobs">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Background work</p>
              <h2>Publish jobs</h2>
            </div>
            <div className={`workerHealth ${overview.worker.state}`}>
              <strong>Worker {workerStateLabel(overview.worker.state)}</strong>
              <span title={overview.worker.heartbeatAt?.toISOString()}>
                {overview.worker.heartbeatAt
                  ? `Heartbeat ${relativeDate(overview.worker.heartbeatAt)}`
                  : "No heartbeat recorded"}
              </span>
            </div>
          </div>
          {filters.workerRestart && (
            <p
              className={`formNotice ${filters.workerRestart === "started" || filters.workerRestart === "already-online" ? "formNotice--success" : "formNotice--error"}`}
              role="status"
            >
              {workerRestartMessage(filters.workerRestart)}
            </p>
          )}
          {overview.worker.state !== "online" && overview.stats.activePublishJobs > 0 && (
            <p className="formNotice formNotice--error" role="status">
              {overview.stats.activePublishJobs} publication job
              {overview.stats.activePublishJobs === 1 ? " is" : "s are"} waiting because the worker
              is {workerStateLabel(overview.worker.state)}.
            </p>
          )}
          {!["online", "starting"].includes(overview.worker.state) &&
            overview.workerRestartAvailable && (
              <form action={restartWorkerAction} className="workerRestartAction">
                <PendingSubmit pendingLabel="Starting worker…">Restart worker</PendingSubmit>
                <span>The control starts a fresh local worker process.</span>
              </form>
            )}
          <PaginatedPublishJobs
            locale={locale}
            items={overview.publishJobs.map((job) => (
              <div className="jobRow" key={job.id}>
                <div>
                  <strong>
                    {job.status === "queued" && overview.worker.state !== "online"
                      ? `Queued — worker ${workerStateLabel(overview.worker.state)}`
                      : job.status}
                  </strong>
                  <p>
                    website {shortId(job.websiteId)} | draft{" "}
                    {job.requestedDraftRevision ?? "current"} | attempt {job.attemptCount}/
                    {job.maxAttempts}
                  </p>
                </div>
                <small>{relativeDate(job.completedAt ?? job.createdAt)}</small>
                {canRetryPublicationJob(job.status) && (
                  <form action={retryPublicationJobAction}>
                    <input name="jobId" type="hidden" value={job.id} />
                    <PendingSubmit className="inlineButton" pendingLabel="Queueing...">
                      Retry
                    </PendingSubmit>
                  </form>
                )}
              </div>
            ))}
          />
          {overview.publishJobs.length === 0 && (
            <p className="empty">Publish jobs appear here after you press Publish.</p>
          )}
        </div>
        <WebsiteCreationSwitcher
          initialMode={createCommerce ? "commerce" : "website"}
          commerceForm={
            <CommerceCreatePanel
              error={filters.createError}
              hostnameRoot={hostnameRoot}
              hostingDomainId={defaultHostingDomain?.id}
              locale={locale}
              templates={readyCommerceTemplates}
            />
          }
          websiteForm={
            <WebsiteCreateWizard
              creationError={
                filters.createError === "subdomain-taken"
                  ? `${filters.hostname ?? "That subdomain"} is already in use. Choose another subdomain.`
                  : filters.createError === "template-not-ready"
                    ? "That template version is no longer available. Choose the latest version and try again."
                    : undefined
              }
              clients={overview.clients.map((client) => ({
                id: client.id,
                label: client.name,
                value: client.id,
              }))}
              initialTemplate={filters.template}
              hostingDomains={hostingDomains.map((domain) => ({
                id: domain.id,
                hostname: domain.hostnameDisplay,
                isDefault: domain.isDefault,
                hostedWebsiteCount: domain.hostedWebsiteCount,
              }))}
              templates={overview.templates.flatMap((template) =>
                template.latestVersion
                  ? [
                      {
                        id: template.templateId,
                        label: `${template.displayName} ${template.latestVersion}`,
                        value: `${template.templateId}@${template.latestVersion}`,
                        group: template.category,
                      },
                    ]
                  : [],
              )}
            />
          }
        />
      </section>
    </>
  );
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function workerStateLabel(state: string): string {
  return state === "online"
    ? "online"
    : state === "starting"
      ? "starting"
      : state === "stopping"
        ? "stopping"
        : state === "unhealthy"
          ? "unhealthy"
          : "offline";
}

function workerRestartMessage(outcome: string): string {
  if (outcome === "started")
    return "Worker restart requested. Its status will turn online after the first heartbeat.";
  if (outcome === "already-online") return "The worker is already online.";
  if (outcome === "already-starting") return "The worker is already starting.";
  if (outcome === "still-running")
    return "The previous worker process is still running but not reporting heartbeats. Stop it before starting another instance.";
  if (outcome === "unavailable") return "Worker restart is managed by the production platform.";
  return "The worker could not be started. Check the worker restart log for details.";
}

function relativeDate(value: Date): string {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
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
  return "just now";
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
