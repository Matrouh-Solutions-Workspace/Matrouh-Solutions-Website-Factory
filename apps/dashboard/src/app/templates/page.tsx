import { Icon } from "@/app/icons";
import { loadTemplateCatalog } from "@/server/template-catalog";
import { TemplateImportForm } from "./template-import-form";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await loadTemplateCatalog();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">SDK catalog</p>
          <h1>Templates</h1>
          <p className="sub">
            Preview real template pages, create editable drafts, and install trusted artifacts.
          </p>
        </div>
        <a className="buttonLink secondaryButton" href="#import-template">
          <Icon name="spark" /> Import template
        </a>
      </header>

      <section className="panel templateCatalogPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Installed</p>
            <h2>Template catalog</h2>
          </div>
          <span>{templates.length} templates</span>
        </div>
        <div className="templateCatalogGrid">
          {templates.map((template) => {
            const latest = template.versions[0];
            const detailHref = latest
              ? `/templates/${encodeURIComponent(template.templateId)}/${encodeURIComponent(latest.version)}`
              : "/templates";
            return (
              <article className="templateCard" key={template.templateId}>
                <div className="templateLiveVisual">
                  {latest ? (
                    <iframe
                      aria-hidden="true"
                      loading="lazy"
                      src={`/template-preview/${encodeURIComponent(template.templateId)}/${encodeURIComponent(latest.version)}/`}
                      tabIndex={-1}
                      title={`${template.displayName} thumbnail`}
                    />
                  ) : (
                    <div className="templateVisualFallback">
                      <Icon name="templates" />
                    </div>
                  )}
                </div>
                <div className="templateCardBody">
                  <div>
                    <span className="status">{template.lifecycleStatus}</span>
                    <span className="mutedBadge">v{latest?.version ?? "—"}</span>
                  </div>
                  <h2>{template.displayName}</h2>
                  <p>{template.description}</p>
                  <div className="templateCardActions">
                    <a className="buttonLink" href={detailHref}>
                      Preview &amp; customize
                    </a>
                    <span>
                      {template.versions.length} version{template.versions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {templates.length === 0 && (
          <p className="empty">
            No catalog entries yet. Import a trusted artifact below or run pnpm seed:demo.
          </p>
        )}
      </section>

      <section className="panel templateImportPanel" id="import-template">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Trusted artifacts</p>
            <h2>Import a template</h2>
          </div>
          <span>Local deployments</span>
        </div>
        <p className="templateImportIntro">
          Upload the three outputs from a template build. The Factory checks identity,
          compatibility, schemas, integrity, and executable/manifest consistency before adding it to
          this catalog.
        </p>
        <TemplateImportForm />
      </section>
    </>
  );
}
