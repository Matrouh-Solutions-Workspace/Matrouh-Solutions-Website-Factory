import { loadDashboardOverview } from "@/server/overview";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const overview = await loadDashboardOverview();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">SDK catalog</p>
          <h1>Templates</h1>
          <p className="sub">Installed template artifacts and compatibility state.</p>
        </div>
      </header>
      <section className="panel templateCatalogPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Discovered</p>
            <h2>Template catalog</h2>
          </div>
          <span>{overview.templates.length} entries</span>
        </div>
        <div className="templateCatalogGrid">
          {overview.templates.map((template, index) => (
            <article className={`templateCard templateCard${index % 3}`} key={template.templateId}>
              <div className="templateVisual">
                <span>{initials(template.displayName)}</span>
                <small>Responsive website system</small>
              </div>
              <div className="templateCardBody">
                <div>
                  <span className="status">{template.lifecycleStatus}</span>
                  <span className="mutedBadge">v{template.latestVersion ?? "—"}</span>
                </div>
                <h2>{template.displayName}</h2>
                <p>
                  {template.category} · {template.templateId}
                </p>
                <a className="buttonLink secondaryButton" href="/websites#create-website">
                  Use this template
                </a>
              </div>
            </article>
          ))}
        </div>
        {overview.templates.length === 0 && (
          <p className="empty">Run pnpm seed:demo to populate the catalog.</p>
        )}
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
