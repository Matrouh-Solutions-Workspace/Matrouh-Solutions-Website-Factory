import { Icon } from "@/app/icons";
import { loadTemplateCatalog } from "@/server/template-catalog";
import { templateListingId } from "./catalog-display";
import { TemplateCategoryForm } from "./template-category-form";
import { TemplateImportForm } from "./template-import-form";
import { loadEcommerceTemplates } from "@/server/ecommerce";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [templates, commerceTemplates] = await Promise.all([
    loadTemplateCatalog(),
    loadEcommerceTemplates(),
  ]);
  const categorySuggestions = uniqueSorted(templates.map((template) => template.catalog.category));
  const categoryArSuggestions = uniqueSorted(
    templates.map((template) => template.catalog.categoryAr),
  );
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Design library</p>
          <h1>Templates</h1>
          <p className="sub">
            Explore website, QR menu, portfolio, and e-commerce designs in one library.
          </p>
        </div>
        <div className="headerActions templatePageActions">
          <a className="buttonLink" href="/dashboard/templates/public-listing">
            <Icon name="settings" /> Public catalog
          </a>
          <a className="buttonLink secondaryButton" href="#import-template">
            <Icon name="spark" /> Import template
          </a>
        </div>
      </header>

      <section className="panel templateCatalogPanel" id="ecommerce-templates">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Installed</p>
            <h2>Template catalog</h2>
          </div>
          <span>{templates.length + commerceTemplates.length} templates</span>
        </div>
        <div className="templateCatalogGrid">
          {commerceTemplates.map((template) => {
            const latest = template.versions[0];
            return (
              <article className="templateCard" key={`commerce:${template.id}`}>
                <div className="templateLiveVisual">
                  {latest ? (
                    <iframe
                      aria-hidden="true"
                      loading="lazy"
                      src={`/commerce-template-preview/${encodeURIComponent(latest.rendererKey)}`}
                      tabIndex={-1}
                      title={`${template.name} storefront thumbnail`}
                    />
                  ) : (
                    <div className="templateVisualFallback">
                      <Icon name="templates" />
                    </div>
                  )}
                </div>
                <div className="templateCardBody">
                  <div>
                    <span className={`status ${template.status}`}>{template.status}</span>
                    <span className="mutedBadge">E-commerce</span>
                    <span className="mutedBadge">v{latest?.version ?? "—"}</span>
                  </div>
                  <h2>{template.name}</h2>
                  <p>{template.description}</p>
                  <div className="templateCardActions">
                    <a
                      className="buttonLink"
                      href={
                        latest
                          ? `/commerce-template-preview/${encodeURIComponent(latest.rendererKey)}`
                          : "/ecommerce/templates"
                      }
                      rel="noreferrer"
                      target="_blank"
                    >
                      Preview storefront
                    </a>
                    <span>
                      {template.versions.length} version{template.versions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="templateCardListing">
                  <div>
                    <span className="templateCardListingEyebrow">E-commerce template</span>
                    <strong>Storefront design</strong>
                    <small>Manage storefront versions separately</small>
                  </div>
                  <a className="buttonLink secondaryButton" href="/ecommerce/templates">
                    View versions
                  </a>
                </div>
              </article>
            );
          })}
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
                      src={`/template-preview/${encodeURIComponent(template.templateId)}/${encodeURIComponent(latest.version)}`}
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
                    <span className={template.catalog.visible ? "status active" : "status failed"}>
                      {template.catalog.visible ? "Public" : "Hidden"}
                    </span>
                    <span className="mutedBadge">{template.catalog.category}</span>
                    <span className="mutedBadge">Arabic{" & "}English</span>
                    <span className="mutedBadge">Light{" & "}dark</span>
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
                <TemplateCategoryForm
                  categoryArSuggestions={categoryArSuggestions}
                  categorySuggestions={categorySuggestions}
                  template={template}
                />
                <div className="templateCardListing">
                  <div>
                    <span className="templateCardListingEyebrow">Public listing</span>
                    <strong>
                      {template.catalog.visible ? "Visible in catalog" : "Hidden from catalog"}
                    </strong>
                    <small>
                      {template.catalog.visible
                        ? "Customers can discover this template"
                        : "Customers cannot see this template"}
                    </small>
                  </div>
                  <a
                    className="buttonLink secondaryButton"
                    href={`/dashboard/templates/public-listing?template=${encodeURIComponent(template.templateId)}#${templateListingId(template.templateId)}`}
                  >
                    Manage listing
                  </a>
                </div>
              </article>
            );
          })}
        </div>
        {templates.length + commerceTemplates.length === 0 && (
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

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}
