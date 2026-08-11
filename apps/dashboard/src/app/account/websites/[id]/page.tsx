import { notFound } from "next/navigation";
import { updateSectionDraftAction, updateWebsiteIdentityAction } from "@/app/actions";
import { CoordinatePickerFields, StructuredListField } from "@/app/structured-list-field";
import { DraftEditorForm } from "@/app/draft-editor-form";
import { MediaPicker } from "@/app/media-picker";
import { loadClientWebsiteEditor } from "@/server/editor";
import { dashboardConfig } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function ClientWebsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const editor = await loadClientWebsiteEditor(id);
  if (!editor) notFound();
  return (
    <div className="clientWebsiteManager">
      <header className="websiteEditorHeader">
        <div>
          <p className="eyebrow">Website manager</p>
          <h1>{editor.website.name}</h1>
          <p className="sub">
            {editor.website.pendingUpdate
              ? "Your changes are saved and waiting to be published."
              : "Changes save automatically and will be marked for publishing."}
          </p>
        </div>
        <div className="headerActions">
          {editor.website.hostname ? (
            <a
              className="buttonLink secondaryButton"
              href={publicWebsiteUrl(editor.website.hostname)}
              rel="noreferrer"
              target="_blank"
            >
              View live website
            </a>
          ) : null}
          <a className="textLink editorBackLink" href="/account">
            ← My websites
          </a>
        </div>
      </header>

      <section className="editorMetaBar websiteEditorMeta" aria-label="Website status">
        <div>
          <span>Status</span>
          <strong className="status">
            {editor.website.pendingUpdate ? "pending update" : editor.website.status}
          </strong>
        </div>
        <div>
          <span>Domain</span>
          <strong>{editor.website.hostname ?? "Domain pending"}</strong>
        </div>
        <div>
          <span>Draft revision</span>
          <strong>{editor.website.draftRevision}</strong>
        </div>
      </section>

      <DraftEditorForm action={updateWebsiteIdentityAction} className="panel editForm">
        <input name="websiteId" type="hidden" value={editor.website.id} />
        <div className="panelHead">
          <div>
            <p className="eyebrow">Website identity</p>
            <h2>Dashboard title</h2>
          </div>
        </div>
        <label>
          Website title
          <input defaultValue={editor.website.name} maxLength={200} name="name" required />
        </label>
      </DraftEditorForm>

      <section className="clientContentWorkspace">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Content</p>
            <h2>Edit your pages</h2>
            <p className="sub">
              Every change is autosaved. Select existing images or upload a new one from the image
              picker.
            </p>
          </div>
        </div>
        {editor.pages.map((page) => (
          <section className="panel pageContentEditor" key={page.id}>
            <div className="panelHead">
              <div>
                <p className="eyebrow">{page.locale}</p>
                <h2>{page.title}</h2>
              </div>
              <span>{page.slug}</span>
            </div>
            <div className="sectionStack">
              {page.sections.map((section) => (
                <article className="sectionEditor" key={section.id}>
                  <DraftEditorForm action={updateSectionDraftAction} className="sectionContentForm">
                    <input name="websiteId" type="hidden" value={editor.website.id} />
                    <input name="sectionId" type="hidden" value={section.id} />
                    <input name="expectedRevision" type="hidden" value={section.revision} />
                    <div className="sectionEditorHead">
                      <div>
                        <strong>{section.title}</strong>
                        <p>{section.sectionTypeId}</p>
                      </div>
                    </div>
                    {section.fields.length > 0 ? (
                      section.fields.map((field) =>
                        field.name === "longitude" ? null : field.name === "latitude" ? (
                          <CoordinatePickerFields
                            key="location-coordinates"
                            latitude={field.value}
                            longitude={
                              section.fields.find((item) => item.name === "longitude")?.value ?? "0"
                            }
                          />
                        ) : field.control === "list" ? (
                          <StructuredListField
                            fieldName={field.name}
                            initialJson={field.value}
                            key={field.name}
                            label={field.label}
                            locationMode={field.label === "Locations"}
                            mediaAssets={editor.mediaAssets}
                            websiteId={editor.website.id}
                          />
                        ) : field.control === "media" ? (
                          <MediaPicker
                            assets={editor.mediaAssets}
                            defaultValue={field.value === "null" ? "" : field.value}
                            key={field.name}
                            label={field.label}
                            name={`field:${field.name}`}
                            websiteId={editor.website.id}
                          />
                        ) : field.control === "textarea" ? (
                          <label key={field.name}>
                            {field.label}
                            <textarea
                              defaultValue={field.value}
                              name={`field:${field.name}`}
                              required={field.required}
                              rows={5}
                            />
                          </label>
                        ) : (
                          <label key={field.name}>
                            {field.label}
                            {field.control === "group" ? (
                              <textarea
                                defaultValue={field.value}
                                name={`jsonField:${field.name}`}
                                required={field.required}
                                rows={7}
                              />
                            ) : field.control === "boolean" ? (
                              <select
                                defaultValue={field.value}
                                name={`jsonField:${field.name}`}
                                required={field.required}
                              >
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            ) : field.control === "number" ? (
                              <input
                                defaultValue={field.value}
                                name={`jsonField:${field.name}`}
                                required={field.required}
                                type="number"
                              />
                            ) : (
                              <input
                                defaultValue={field.value}
                                name={`field:${field.name}`}
                                required={field.required}
                              />
                            )}
                          </label>
                        ),
                      )
                    ) : (
                      <label>
                        Content JSON
                        <textarea
                          defaultValue={JSON.stringify(section.content, null, 2)}
                          name="contentJson"
                          rows={10}
                        />
                      </label>
                    )}
                  </DraftEditorForm>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}

function publicWebsiteUrl(hostname: string): string {
  const dashboard = new URL(dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL);
  dashboard.hostname = hostname;
  dashboard.pathname = "/";
  dashboard.search = "";
  return dashboard.toString();
}
