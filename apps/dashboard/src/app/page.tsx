import { join } from "node:path";
import { discoverTemplates } from "@factory/template-loader";
import { createWebsiteAction, previewWebsiteAction, publishWebsiteAction } from "@/app/actions";
import { PendingSubmit } from "@/app/pending-submit";
import { loadDashboardOverview } from "@/server/overview";

export const dynamic = "force-dynamic";

async function templateCatalog() {
  try {
    return await discoverTemplates(join(process.cwd(), "..", "..", "templates"));
  } catch {
    return [];
  }
}

export default async function Dashboard() {
  const [templates, overview] = await Promise.all([templateCatalog(), loadDashboardOverview()]);
  const websites = overview.websites;
  const catalog = overview.templates.length
    ? overview.templates
    : templates.map(({ discovery }) => ({
        templateId: discovery.templateId,
        displayName: discovery.templateId.split(".").at(-1) ?? discovery.templateId,
        category: "Template",
        lifecycleStatus: "ready",
        latestVersion: discovery.templateVersion,
      }));

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">{headerDate()}</p>
          <h1>{overview.organization?.name ?? "Website Factory"}</h1>
          <p className="sub">A clear view of your websites, delivery status, and recent work.</p>
        </div>
        <a className="buttonLink" href="#create-website">
          Create website
        </a>
      </header>
      <section className="stats">
        {[
          [
            "Websites",
            String(overview.stats.websites || websites.length),
            `${overview.stats.publishedWebsites} published`,
          ],
          ["Templates", String(overview.stats.templates || catalog.length), "Validated catalog"],
          ["Domains", String(overview.stats.activeDomains), "Active hostnames"],
          [
            "Publish jobs",
            String(overview.stats.activePublishJobs),
            `${overview.stats.failedPublishJobs} failed`,
          ],
        ].map(([label, value, note]) => (
          <article key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className="workspaceGrid">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2>Recent websites</h2>
            </div>
            <span>{Math.min(websites.length, 6)} recent</span>
          </div>
          {websites.slice(0, 6).map((website, index) => (
            <div className="website" key={website.id}>
              <div className={`thumb t${index % 2}`}>{initials(website.name)}</div>
              <div>
                <strong>{website.name}</strong>
                <p>
                  {website.domains[0]?.hostname ?? "No domain"} | {website.templateVersion} |{" "}
                  {website.pages} page{website.pages === 1 ? "" : "s"}
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
                <small>{relativeDate(website.updatedAt)}</small>
              </div>
            </div>
          ))}
          {websites.length === 0 && (
            <div className="emptyState">
              <strong>No websites yet</strong>
              <p>Create your first draft from a validated template.</p>
            </div>
          )}
        </div>
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">SDK catalog</p>
              <h2>Templates</h2>
            </div>
          </div>
          {catalog.map((template) => (
            <div className="template" key={template.templateId}>
              <div className="templateIcon">TM</div>
              <div>
                <strong>{template.displayName}</strong>
                <p>
                  {template.latestVersion ?? "No version"} | {template.category}
                </p>
              </div>
              <span>{template.lifecycleStatus}</span>
            </div>
          ))}
          {catalog.length === 0 && (
            <p className="empty">Run pnpm seed:demo to populate the catalog.</p>
          )}
        </div>
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Publish queue</h2>
            </div>
            <span>{overview.publishJobs.length} recent</span>
          </div>
          {overview.publishJobs.slice(0, 6).map((job) => (
            <div className="jobRow" key={job.id}>
              <div>
                <strong>{job.status}</strong>
                <p>
                  {shortId(job.websiteId)} | attempt {job.attemptCount}/{job.maxAttempts}
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
              <h2>Create from template</h2>
            </div>
          </div>
          <label>
            Website name
            <input name="name" placeholder="North Coast Clinic" required />
          </label>
          <label>
            Local hostname
            <span className="fieldHint">A short unique suffix is added automatically</span>
            <input name="hostname" placeholder="north-coast-clinic" />
          </label>
          <label>
            Template
            <select name="template" required>
              {catalog.map((template) => (
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

function headerDate(): string {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(
    new Date(),
  );
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
