import { Icon } from "@/app/icons";
import { loadTemplateCatalog } from "@/server/template-catalog";
import { catalogBillingLabel, formatCatalogPrice, templateListingId } from "../catalog-display";
import { TemplateCatalogSettingsForm } from "../template-catalog-settings-form";

export const dynamic = "force-dynamic";

export default async function PublicTemplateListingPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ template?: string }>;
}) {
  const [templates, parameters] = await Promise.all([loadTemplateCatalog(), searchParams]);
  const orderedTemplates = [...templates].sort(
    (left, right) =>
      left.catalog.sortOrder - right.catalog.sortOrder ||
      left.displayName.localeCompare(right.displayName),
  );
  const visibleCount = templates.filter((template) => template.catalog.visible).length;
  const featuredCount = templates.filter((template) => template.catalog.featured).length;
  const categoryCount = new Set(templates.map((template) => template.catalog.category)).size;

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Public catalog</p>
          <h1>Listing controls</h1>
          <p className="sub">
            Manage package visibility, pricing, order, and sales content in one focused workspace.
          </p>
        </div>
        <div className="headerActions templatePageActions">
          <a className="buttonLink secondaryButton" href="/dashboard/templates">
            <Icon name="arrow" /> Template library
          </a>
          <a className="buttonLink" href="/templates?locale=ar" rel="noreferrer" target="_blank">
            View public catalog
          </a>
        </div>
      </header>

      <section aria-label="Public catalog overview" className="templatePublicCatalogStats">
        <article>
          <span>All packages</span>
          <strong>{templates.length}</strong>
          <small>Installed and ready</small>
        </article>
        <article>
          <span>Visible</span>
          <strong>{visibleCount}</strong>
          <small>Shown to customers</small>
        </article>
        <article>
          <span>Hidden</span>
          <strong>{templates.length - visibleCount}</strong>
          <small>Kept out of the catalog</small>
        </article>
        <article>
          <span>Featured</span>
          <strong>{featuredCount}</strong>
          <small>Promoted packages</small>
        </article>
        <article>
          <span>Categories</span>
          <strong>{categoryCount}</strong>
          <small>Customer-facing groups</small>
        </article>
      </section>

      <section className="panel templatePublicCatalogWorkspace">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Catalog packages</p>
            <h2>Choose a listing to edit</h2>
          </div>
          <span>{templates.length} packages</span>
        </div>
        <p className="templatePublicCatalogIntro">
          Packages are shown in their current public sort order. Open one package to edit its public
          listing without loading every form at once.
        </p>

        <div className="templatePublicListingStack">
          {orderedTemplates.map((template, index) => {
            const latest = template.versions[0];
            const selected = parameters.template === template.templateId;
            return (
              <details
                className="templatePublicListingEditor"
                id={templateListingId(template.templateId)}
                key={template.templateId}
                name="public-template-listing"
                open={selected}
              >
                <summary>
                  <div className="templatePublicListingIdentity">
                    <span aria-hidden="true" className="templatePublicListingIndex">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{template.displayName}</strong>
                      <small>
                        {template.catalog.category} · v{latest?.version ?? "—"} ·{" "}
                        {template.templateId}
                      </small>
                    </div>
                  </div>
                  <div className="templatePublicListingSummaryMeta">
                    {template.catalog.featured ? (
                      <span className="mutedBadge">Featured</span>
                    ) : null}
                    <span className={template.catalog.visible ? "status active" : "status failed"}>
                      {template.catalog.visible ? "Visible" : "Hidden"}
                    </span>
                    <div>
                      <strong>{formatCatalogPrice(template.catalog)}</strong>
                      <small>{catalogBillingLabel(template.catalog.billingPeriod)}</small>
                    </div>
                    <span className="templatePublicListingEditLabel">Edit listing</span>
                  </div>
                </summary>
                <TemplateCatalogSettingsForm showHeader={false} template={template} />
              </details>
            );
          })}
        </div>

        {templates.length === 0 ? (
          <p className="empty">No installed templates are available to list publicly.</p>
        ) : null}
      </section>
    </>
  );
}
