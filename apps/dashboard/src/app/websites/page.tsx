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
  }>;
}) {
  const [overview, hostingDomains] = await Promise.all([
    loadDashboardOverview(),
    loadHostingDomainChoices(),
  ]);
  const filters = await searchParams;
  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "all";
  const websites = overview.websites.filter(
    (website) =>
      (!query ||
        website.name.toLowerCase().includes(query) ||
        website.domains.some((domain) => domain.hostname.toLowerCase().includes(query))) &&
      (status === "all" || website.status === status),
  );
  const hasActivePublication = overview.websites.some((website) =>
    isActivePublicationJob(website.latestPublishJob?.status),
  );
  return (
    <>
      <PublicationStatusRefresh active={hasActivePublication} />
      <header>
        <div>
          <p className="eyebrow">Factory output</p>
          <h1>Websites</h1>
          <p className="sub">Create, inspect, and publish template-driven websites.</p>
        </div>
        <a className="buttonLink" href="#create-website">
          New website
        </a>
      </header>
      <section className="workspaceGrid">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>Managed websites</h2>
            </div>
            <span>{websites.length} visible</span>
          </div>
          <form className="websiteToolbar" method="get">
            <label>
              <span className="srOnly">Search websites</span>
              <input
                defaultValue={filters.q ?? ""}
                name="q"
                placeholder="Search name or domain"
                type="search"
              />
            </label>
            <label>
              <span className="srOnly">Filter by status</span>
              <select defaultValue={status} name="status">
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <button className="secondaryButton" type="submit">
              Filter
            </button>
            {(query || status !== "all") && (
              <a className="textLink" href="/websites">
                Clear
              </a>
            )}
          </form>
          {websites.map((website) => (
            <div className="website" key={website.id}>
              <div className="thumb">{initials(website.name)}</div>
              <div>
                <strong>{website.name}</strong>
                <p>
                  {website.templateId} | {website.templateVersion} | {website.pages} page
                  {website.pages === 1 ? "" : "s"}
                </p>
              </div>
              <div className="statusStack">
                <span className="status">{website.status}</span>
                {website.latestPublishJob && (
                  <span className={`jobStatus ${website.latestPublishJob.status}`}>
                    {website.latestPublishJob.status}
                  </span>
                )}
              </div>
              <div className="rowActions">
                <a href={`/websites/${website.id}`}>Edit</a>
                {website.domains[0] && (
                  <a
                    href={`http://${website.domains[0].hostname}:3001`}
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
                      website.status !== "published" &&
                      isActivePublicationJob(website.latestPublishJob?.status)
                    }
                    pendingLabel={website.status === "published" ? "Unpublishing…" : "Publishing…"}
                  >
                    {website.status === "published"
                      ? "Unpublish"
                      : isActivePublicationJob(website.latestPublishJob?.status)
                        ? "Publish queued"
                        : "Publish"}
                  </PendingSubmit>
                </form>
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
                <form action={previewWebsiteAction}>
                  <input name="websiteId" type="hidden" value={website.id} />
                  <PendingSubmit className="inlineButton" pendingLabel="Preparing…">
                    Preview
                  </PendingSubmit>
                </form>
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
          ))}
          {websites.length === 0 && (
            <div className="emptyState">
              <strong>
                {overview.websites.length ? "No matching websites" : "No websites yet"}
              </strong>
              <p>
                {overview.websites.length
                  ? "Try a different search or clear the filters."
                  : "Create your first website from a validated template."}
              </p>
            </div>
          )}
        </div>
        <div className="panel" id="publish-jobs">
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
          {overview.publishJobs.map((job) => (
            <div className="jobRow" key={job.id}>
              <div>
                <strong>
                  {job.status === "queued" && overview.worker.state !== "online"
                    ? `Queued — worker ${workerStateLabel(overview.worker.state)}`
                    : job.status}
                </strong>
                <p>
                  website {shortId(job.websiteId)} | draft {job.requestedDraftRevision ?? "current"}{" "}
                  | attempt {job.attemptCount}/{job.maxAttempts}
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
          {overview.publishJobs.length === 0 && (
            <p className="empty">Publish jobs appear here after you press Publish.</p>
          )}
        </div>
        <WebsiteCreateWizard
          creationError={
            filters.createError === "subdomain-taken"
              ? `${filters.hostname ?? "That subdomain"} is already in use. Choose another subdomain.`
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
          templates={overview.templates.map((template) => ({
            id: template.templateId,
            label: `${template.displayName} ${template.latestVersion ?? ""}`,
            value: `${template.templateId}@${template.latestVersion ?? "1.0.0"}`,
          }))}
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
