import { loadEcommerceTemplates, requireCommerceAdministrator } from "@/server/ecommerce";

export const dynamic = "force-dynamic";

export default async function EcommerceTemplatesPage() {
  await requireCommerceAdministrator();
  const templates = await loadEcommerceTemplates();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Commerce presentation library</p>
          <h1>E-commerce templates</h1>
          <p className="sub">
            Presentation-only templates. Store catalog and orders remain unchanged when templates
            switch.
          </p>
        </div>
        <a className="buttonLink secondaryButton" href="/ecommerce">
          Back to stores
        </a>
      </header>
      <section className="panel">
        <div className="commerceTemplateGrid">
          {templates.map((template) => (
            <article className="commerceStoreCard commerceTemplateCard" key={template.id}>
              {template.versions[0] ? (
                <div className="commerceTemplatePreview">
                  <iframe
                    loading="lazy"
                    src={`/commerce-template-preview/${template.versions[0].rendererKey}`}
                    title={`${template.name} storefront preview`}
                  />
                  <span>Live storefront preview</span>
                </div>
              ) : null}
              <div className="commerceTemplateCardHead">
                <div>
                  <p className="eyebrow">Commerce template</p>
                  <h2>{template.name}</h2>
                </div>
                <span className={`status ${template.status}`}>{template.status}</span>
              </div>
              <p>{template.description}</p>
              {template.versions.map((version) => (
                <div className="commerceTemplateVersion" key={version.id}>
                  <strong>{version.version}</strong>
                  <span>{version.rendererKey}</span>
                  <span>{version.status}</span>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
