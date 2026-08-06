import {
  createWebsiteAction,
  deleteWebsiteAction,
  previewWebsiteAction,
  publishWebsiteAction,
} from "@/app/actions";
import { ConfirmSubmit } from "@/app/confirm-submit";
import { PendingSubmit } from "@/app/pending-submit";
import { loadDashboardOverview } from "@/server/overview";

export const dynamic = "force-dynamic";

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const overview = await loadDashboardOverview();
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
  return (
    <>
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
                <form action={publishWebsiteAction}>
                  <input name="websiteId" type="hidden" value={website.id} />
                  <PendingSubmit className="inlineButton" pendingLabel="Publishing…">
                    Publish
                  </PendingSubmit>
                </form>
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
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Background work</p>
              <h2>Publish jobs</h2>
            </div>
            <span>{overview.stats.activePublishJobs} active</span>
          </div>
          {overview.publishJobs.map((job) => (
            <div className="jobRow" key={job.id}>
              <div>
                <strong>{job.status}</strong>
                <p>
                  website {shortId(job.websiteId)} | draft {job.requestedDraftRevision ?? "current"}{" "}
                  | attempt {job.attemptCount}/{job.maxAttempts}
                </p>
              </div>
              <small>{relativeDate(job.completedAt ?? job.createdAt)}</small>
            </div>
          ))}
          {overview.publishJobs.length === 0 && (
            <p className="empty">Publish jobs appear here after you press Publish.</p>
          )}
        </div>
        <form action={createWebsiteAction} className="panel createPanel" id="create-website">
          <div className="panelHead">
            <div>
              <p className="eyebrow">New website</p>
              <h2>Create draft</h2>
            </div>
          </div>
          <label>
            Website name
            <input name="name" placeholder="North Coast Clinic" required />
          </label>
          <label>
            Local hostname
            <span className="fieldHint">A unique suffix is added automatically.</span>
            <input name="hostname" placeholder="north-coast-clinic" />
          </label>
          <label>
            Template
            <select name="template" required>
              {overview.templates.map((template) => (
                <option
                  key={template.templateId}
                  value={`${template.templateId}@${template.latestVersion ?? "1.0.0"}`}
                >
                  {template.displayName} {template.latestVersion ?? ""}
                </option>
              ))}
            </select>
          </label>
          <PendingSubmit pendingLabel="Creating draft…">Create draft</PendingSubmit>
        </form>
      </section>
    </>
  );
}

function shortId(value: string): string {
  return value.slice(0, 8);
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
