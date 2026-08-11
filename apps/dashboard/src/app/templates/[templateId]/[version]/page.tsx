import { notFound } from "next/navigation";
import { loadExactCatalogTemplate, loadTemplateCatalog } from "@/server/template-catalog";

export const dynamic = "force-dynamic";

interface TemplateDetailProperties {
  readonly params: Promise<{ readonly templateId: string; readonly version: string }>;
}

export default async function TemplateDetailPage({ params }: TemplateDetailProperties) {
  const { templateId, version } = await params;
  const [artifact, catalog] = await Promise.all([
    loadExactCatalogTemplate(templateId, version),
    loadTemplateCatalog(),
  ]);
  if (!artifact) notFound();
  const entry = catalog.find((item) => item.templateId === templateId);
  if (!entry) notFound();
  const template = artifact.definition;
  const previewBase = `/dashboard/template-preview/${encodeURIComponent(templateId)}/${encodeURIComponent(version)}`;
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Template details</p>
          <h1>{template.manifest.displayName}</h1>
          <p className="sub">{template.manifest.description}</p>
        </div>
        <div className="headerActions">
          <a className="buttonLink secondaryButton" href="/templates">
            Back to catalog
          </a>
          <a className="buttonLink" href={`${previewBase}/`} rel="noreferrer" target="_blank">
            Open full preview
          </a>
        </div>
      </header>

      <section className="templatePreviewWorkspace">
        <div className="templatePreviewToolbar">
          <div>
            <span className="status">{entry.lifecycleStatus}</span>
            <strong>Version {version}</strong>
          </div>
          <nav aria-label="Template preview pages">
            {template.pages.map((page, index) => {
              const path = page.slug.defaultValue ?? (index === 0 ? "/" : slug(page.title));
              return (
                <a
                  href={`${previewBase}${path === "/" ? "/" : `/${path.replace(/^\/+/, "")}`}`}
                  key={page.id}
                  target="template-preview-frame"
                >
                  {page.title}
                </a>
              );
            })}
          </nav>
          <span>Arabic, English &amp; light/dark controls are available inside the preview.</span>
        </div>
        <div className="templatePreviewFrame">
          <iframe
            name="template-preview-frame"
            src={`${previewBase}/`}
            title={`${template.manifest.displayName} preview`}
          />
        </div>
      </section>

      <div className="templateDetailColumns">
        <section className="panel templateCustomizePanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Editable copy</p>
              <h2>Customize this template</h2>
            </div>
            <span>Creates a draft</span>
          </div>
          <p>
            Released template artifacts are immutable. Create a website draft from this exact
            version, then edit its pages, sections, content, theme, navigation, and SEO in the
            website editor.
          </p>
          <a
            className="buttonLink"
            href={`/websites?template=${encodeURIComponent(`${templateId}@${version}`)}#create-website`}
          >
            Start guided setup
          </a>
        </section>

        <section className="panel templateContractPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Artifact contract</p>
              <h2>Template information</h2>
            </div>
            <span>{template.manifest.category}</span>
          </div>
          <dl className="definitionList">
            <div>
              <dt>Template ID</dt>
              <dd>{template.manifest.id}</dd>
            </div>
            <div>
              <dt>Author</dt>
              <dd>{template.manifest.author}</dd>
            </div>
            <div>
              <dt>Artifact hash</dt>
              <dd title={artifact.artifactHash}>{artifact.artifactHash.slice(0, 16)}…</dd>
            </div>
            <div>
              <dt>SDK version</dt>
              <dd>{template.compatibility.sdkVersion}</dd>
            </div>
            <div>
              <dt>Pages</dt>
              <dd>{template.pages.length}</dd>
            </div>
            <div>
              <dt>Sections</dt>
              <dd>{template.sections.length}</dd>
            </div>
          </dl>
          {entry.versions.length > 1 && (
            <div className="templateVersionLinks">
              <strong>Available versions</strong>
              <div>
                {entry.versions.map((item) => (
                  <a
                    aria-current={item.version === version ? "page" : undefined}
                    href={`/templates/${encodeURIComponent(templateId)}/${encodeURIComponent(item.version)}`}
                    key={item.version}
                  >
                    {item.version}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="panel templateComponentsPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Composition</p>
            <h2>Pages and sections</h2>
          </div>
          <span>{template.pages.length + template.sections.length} definitions</span>
        </div>
        <div className="templateDefinitionGrid">
          {template.pages.map((page) => (
            <article key={page.id}>
              <span>Page</span>
              <strong>{page.title}</strong>
              <p>{page.editor?.description ?? `${page.defaultSections.length} default sections`}</p>
            </article>
          ))}
          {template.sections.map((section) => (
            <article key={section.id}>
              <span>Section · {section.category ?? "content"}</span>
              <strong>{section.title}</strong>
              <p>{section.description ?? "Schema-driven editable content"}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "page"
  );
}
