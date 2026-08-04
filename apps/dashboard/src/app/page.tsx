import { join } from "node:path";
import { discoverTemplates } from "@factory/template-loader";
async function templateCatalog() {
  try {
    return await discoverTemplates(join(process.cwd(), "..", "..", "templates"));
  } catch {
    return [];
  }
}
export default async function Dashboard() {
  const templates = await templateCatalog();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Wednesday, August 5</p>
          <h1>Good morning, Ahmed.</h1>
          <p className="sub">Your website portfolio is healthy and ready to grow.</p>
        </div>
        <button>+ Create website</button>
      </header>
      <section className="stats">
        {[
          ["Websites", "2", "2 published"],
          ["Templates", String(templates.length), "Auto-discovered"],
          ["Domains", "2", "SSL active"],
          ["Media", "0", "Ready for uploads"],
        ].map(([label, value, note]) => (
          <article key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className="grid">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2>Recent websites</h2>
            </div>
            <a href="#">View all</a>
          </div>
          {[...["Doctor Practice", "Multi-specialty Clinic"]].map((name, index) => (
            <div className="website" key={name}>
              <div className={`thumb t${index}`}>{index === 0 ? "DP" : "MC"}</div>
              <div>
                <strong>{name}</strong>
                <p>{index === 0 ? "doctor.localhost" : "clinic.localhost"}</p>
              </div>
              <span className="status">Published</span>
              <small>Just now</small>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">SDK catalog</p>
              <h2>Templates</h2>
            </div>
          </div>
          {templates.map(({ discovery }) => (
            <div className="template" key={discovery.templateId}>
              <div className="templateIcon">◇</div>
              <div>
                <strong>{discovery.templateId.split(".").at(-1)}</strong>
                <p>{discovery.templateVersion} · SDK verified</p>
              </div>
              <span>Ready</span>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="empty">Run template builds to populate the catalog.</p>
          )}
        </div>
      </section>
    </>
  );
}
