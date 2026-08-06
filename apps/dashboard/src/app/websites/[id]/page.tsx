import { notFound } from "next/navigation";
import {
  addSectionDraftAction,
  addWebsiteLocaleAction,
  deleteWebsiteAction,
  deleteSectionDraftAction,
  duplicateSectionDraftAction,
  moveSectionDraftAction,
  previewWebsiteAction,
  publishWebsiteAction,
  rollbackPublicationAction,
  updatePageDraftAction,
  updateNavigationNodeAction,
  updateSectionDraftAction,
  updateThemeDraftAction,
  updateWebsiteSettingsDraftAction,
  upgradeWebsiteTemplateAction,
} from "@/app/actions";
import { ConfirmSubmit } from "@/app/confirm-submit";
import { DraftEditorForm } from "@/app/draft-editor-form";
import { DraggableSection } from "@/app/draggable-section";
import { PendingSubmit } from "@/app/pending-submit";
import { StructuredListField } from "@/app/structured-list-field";
import { loadWebsiteEditor } from "@/server/editor";
import { dashboardConfig } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function WebsiteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const editor = await loadWebsiteEditor(id);
  if (!editor) notFound();

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Draft editor</p>
          <h1>{editor.website.name}</h1>
          <p className="sub">
            {editor.website.templateId} | {editor.website.templateVersion} | revision{" "}
            {editor.website.draftRevision}
          </p>
        </div>
        <div className="headerActions">
          {editor.website.activePublicationId && editor.website.hostname && (
            <a
              className="buttonLink secondaryButton"
              href={websitePublicUrl(editor.website.hostname)}
              rel="noreferrer"
              target="_blank"
            >
              View live
            </a>
          )}
          <form action={previewWebsiteAction}>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <PendingSubmit className="secondaryButton" pendingLabel="Preparing preview…">
              Preview
            </PendingSubmit>
          </form>
          <form action={publishWebsiteAction}>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <PendingSubmit pendingLabel="Queueing…">Publish</PendingSubmit>
          </form>
          <form action={deleteWebsiteAction}>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <ConfirmSubmit
              className="secondaryButton dangerButton"
              confirmation={`Delete “${editor.website.name}” permanently? Its domains, drafts, previews, and publication history will also be deleted. This cannot be undone.`}
              pendingLabel="Deleting…"
            >
              Delete website
            </ConfirmSubmit>
          </form>
          <a className="textLink" href="/websites">
            All websites
          </a>
        </div>
      </header>

      <section aria-label="Website details" className="editorMetaBar">
        <div>
          <span>Status</span>
          <strong className="status">{editor.website.status}</strong>
        </div>
        <div>
          <span>Draft revision</span>
          <strong>{editor.website.draftRevision}</strong>
        </div>
        <div>
          <span>Template</span>
          <strong>{editor.website.templateVersion}</strong>
        </div>
        <div>
          <span>Primary domain</span>
          <strong>{editor.website.hostname ?? "Not connected"}</strong>
        </div>
      </section>

      <form action={addWebsiteLocaleAction} className="panel localeManager">
        <div>
          <p className="eyebrow">Languages</p>
          <h2>Website locales</h2>
          <p>
            {editor.website.locales.join(", ")} · default {editor.website.defaultLocale}
          </p>
        </div>
        <input name="websiteId" type="hidden" value={editor.website.id} />
        <input name="websiteDraftRevision" type="hidden" value={editor.website.draftRevision} />
        <label>
          Add locale
          <input name="locale" placeholder="ar-EG" maxLength={35} required />
        </label>
        <PendingSubmit pendingLabel="Creating locale...">Add language</PendingSubmit>
      </form>

      {editor.availableTemplateVersions.length > 0 && (
        <form action={upgradeWebsiteTemplateAction} className="panel upgradeNotice">
          <div>
            <p className="eyebrow">Template lifecycle</p>
            <h2>Compatible artifact available</h2>
            <p>
              Upgrade is applied only after every current draft validates against the exact target
              version. Existing publications remain pinned and available for rollback.
            </p>
          </div>
          <input name="websiteId" type="hidden" value={editor.website.id} />
          <input name="websiteDraftRevision" type="hidden" value={editor.website.draftRevision} />
          <label>
            Target version
            <select name="targetVersion">
              {editor.availableTemplateVersions.map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
          </label>
          <PendingSubmit pendingLabel="Validating upgrade...">Upgrade template</PendingSubmit>
        </form>
      )}

      <section className="workspaceGrid editorConfiguration">
        {editor.settings && (
          <form action={updateWebsiteSettingsDraftAction} className="panel editForm">
            <div className="panelHead">
              <div>
                <p className="eyebrow">Global content</p>
                <h2>Website settings</h2>
              </div>
              <span>Schema validated</span>
            </div>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <input name="draftId" type="hidden" value={editor.settings.id} />
            <input name="expectedRevision" type="hidden" value={editor.settings.revision} />
            <input name="websiteDraftRevision" type="hidden" value={editor.website.draftRevision} />
            <label>
              Settings JSON
              <textarea name="contentJson" defaultValue={editor.settings.content} rows={12} />
            </label>
            <PendingSubmit pendingLabel="Saving settings...">Save settings</PendingSubmit>
          </form>
        )}
        {editor.theme && (
          <form action={updateThemeDraftAction} className="panel editForm">
            <div className="panelHead">
              <div>
                <p className="eyebrow">Design system</p>
                <h2>Theme tokens</h2>
              </div>
              <span>Colors, type, layout</span>
            </div>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <input name="themeId" type="hidden" value={editor.theme.id} />
            <input name="expectedRevision" type="hidden" value={editor.theme.revision} />
            <input name="websiteDraftRevision" type="hidden" value={editor.website.draftRevision} />
            <label>
              Theme JSON
              <textarea name="tokensJson" defaultValue={editor.theme.tokens} rows={12} />
            </label>
            <PendingSubmit pendingLabel="Saving theme...">Save theme</PendingSubmit>
          </form>
        )}
      </section>

      {editor.navigation.length > 0 && (
        <section className="panel followPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Menus</p>
              <h2>Navigation labels</h2>
            </div>
            <span>{editor.navigation.length} menus</span>
          </div>
          {editor.navigation.map((navigation) => (
            <div className="navigationEditor" key={navigation.id}>
              <strong>{navigation.title}</strong>
              <div className="navigationNodeGrid">
                {navigation.nodes.map((node) => (
                  <form
                    action={updateNavigationNodeAction}
                    className="inlineEditForm"
                    key={node.id}
                  >
                    <input name="websiteId" type="hidden" value={editor.website.id} />
                    <input name="nodeId" type="hidden" value={node.id} />
                    <input name="expectedRevision" type="hidden" value={node.revision} />
                    <input
                      name="websiteDraftRevision"
                      type="hidden"
                      value={editor.website.draftRevision}
                    />
                    <label>
                      {node.kind} label
                      <input name="label" defaultValue={node.label} required />
                    </label>
                    <PendingSubmit className="inlineButton" pendingLabel="Saving...">
                      Save
                    </PendingSubmit>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="editorShell">
        <div className="panel pageListPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Pages</p>
              <h2>Site structure</h2>
            </div>
            <span>{editor.pages.length}</span>
          </div>
          {editor.pages.map((page) => (
            <a className="pageChip" href={`#page-${page.id}`} key={page.id}>
              <strong>{page.title}</strong>
              <span>{page.slug}</span>
            </a>
          ))}
        </div>

        <div className="editorStack">
          {editor.pages.map((page) => (
            <section className="panel" id={`page-${page.id}`} key={page.id}>
              <div className="panelHead">
                <div>
                  <p className="eyebrow">{page.locale}</p>
                  <h2>{page.title}</h2>
                </div>
                <span>{page.sections.length} sections</span>
              </div>

              <DraftEditorForm action={updatePageDraftAction} className="editForm">
                <input name="websiteId" type="hidden" value={editor.website.id} />
                <input name="pageId" type="hidden" value={page.id} />
                <input
                  name="websiteDraftRevision"
                  type="hidden"
                  value={editor.website.draftRevision}
                />
                <input name="expectedRevision" type="hidden" value={page.revision} />
                <label>
                  Page title
                  <input name="title" defaultValue={page.title} required />
                </label>
                <label>
                  Slug
                  <input name="slug" defaultValue={page.slug} required />
                </label>
                <PendingSubmit pendingLabel="Saving page…">Save page</PendingSubmit>
              </DraftEditorForm>

              <div className="sectionStack">
                {page.sections.map((section, sectionIndex) => (
                  <DraggableSection
                    action={moveSectionDraftAction}
                    key={section.id}
                    sectionId={section.id}
                    websiteDraftRevision={editor.website.draftRevision}
                    websiteId={editor.website.id}
                  >
                    <article className="sectionEditor">
                      <DraftEditorForm
                        action={updateSectionDraftAction}
                        className="sectionContentForm"
                      >
                        <input name="websiteId" type="hidden" value={editor.website.id} />
                        <input name="sectionId" type="hidden" value={section.id} />
                        <input
                          name="websiteDraftRevision"
                          type="hidden"
                          value={editor.website.draftRevision}
                        />
                        <input name="expectedRevision" type="hidden" value={section.revision} />
                        <div className="sectionEditorHead">
                          <div>
                            <strong>{section.title}</strong>
                            <p>{section.sectionTypeId}</p>
                          </div>
                          <PendingSubmit className="inlineButton" pendingLabel="Saving…">
                            Save changes
                          </PendingSubmit>
                        </div>
                        {section.fields.length > 0 ? (
                          section.fields.map((field) =>
                            field.control === "list" ? (
                              <StructuredListField
                                fieldName={field.name}
                                initialJson={field.value}
                                key={field.name}
                                label={field.label}
                              />
                            ) : field.control === "textarea" ? (
                              <label key={field.name}>
                                {field.label}
                                <textarea
                                  name={`field:${field.name}`}
                                  defaultValue={field.value}
                                  required={field.required}
                                  rows={5}
                                />
                              </label>
                            ) : (
                              <label key={field.name}>
                                {field.label}
                                {field.control === "group" ? (
                                  <textarea
                                    name={`jsonField:${field.name}`}
                                    defaultValue={field.value}
                                    required={field.required}
                                    rows={7}
                                  />
                                ) : field.control === "boolean" ? (
                                  <select
                                    name={`jsonField:${field.name}`}
                                    defaultValue={field.value}
                                    required={field.required}
                                  >
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                ) : field.control === "number" ? (
                                  <input
                                    name={`jsonField:${field.name}`}
                                    defaultValue={field.value}
                                    required={field.required}
                                    type="number"
                                  />
                                ) : (
                                  <input
                                    name={`field:${field.name}`}
                                    defaultValue={field.value}
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
                              name="contentJson"
                              defaultValue={JSON.stringify(section.content, null, 2)}
                              rows={10}
                            />
                          </label>
                        )}
                      </DraftEditorForm>
                      <div className="sectionManage" aria-label={`${section.title} controls`}>
                        {sectionIndex > 0 && (
                          <SectionCommand
                            action={moveSectionDraftAction}
                            websiteId={editor.website.id}
                            sectionId={section.id}
                            revision={editor.website.draftRevision}
                            label="Move up"
                            direction="up"
                          />
                        )}
                        {sectionIndex < page.sections.length - 1 && (
                          <SectionCommand
                            action={moveSectionDraftAction}
                            websiteId={editor.website.id}
                            sectionId={section.id}
                            revision={editor.website.draftRevision}
                            label="Move down"
                            direction="down"
                          />
                        )}
                        {section.canDuplicate && (
                          <SectionCommand
                            action={duplicateSectionDraftAction}
                            websiteId={editor.website.id}
                            sectionId={section.id}
                            revision={editor.website.draftRevision}
                            label="Duplicate"
                          />
                        )}
                        {section.canDelete && (
                          <SectionCommand
                            action={deleteSectionDraftAction}
                            websiteId={editor.website.id}
                            sectionId={section.id}
                            revision={editor.website.draftRevision}
                            label="Delete"
                            danger
                          />
                        )}
                      </div>
                    </article>
                  </DraggableSection>
                ))}
                {page.allowedSections.some((section) => section.canAdd) && (
                  <form action={addSectionDraftAction} className="addSectionBar">
                    <input name="websiteId" type="hidden" value={editor.website.id} />
                    <input name="pageId" type="hidden" value={page.id} />
                    <input
                      name="websiteDraftRevision"
                      type="hidden"
                      value={editor.website.draftRevision}
                    />
                    <label>
                      Add section
                      <select name="sectionTypeId" required>
                        {page.allowedSections
                          .filter((section) => section.canAdd)
                          .map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    <PendingSubmit className="secondaryButton" pendingLabel="Adding…">
                      Add section
                    </PendingSubmit>
                  </form>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="panel followPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Delivery history</p>
            <h2>Publications</h2>
          </div>
          <span>{editor.publications.length} retained</span>
        </div>
        {editor.publications.map((publication) => {
          const isActive = publication.id === editor.website.activePublicationId;
          return (
            <div className="publicationRow" key={publication.id}>
              <div>
                <div className="publicationTitle">
                  <strong>Publication {publication.sequenceNumber}</strong>
                  {isActive && <span className="jobStatus succeeded">active</span>}
                </div>
                <p>
                  Draft {publication.sourceDraftRevision} | template {publication.templateVersion} |{" "}
                  {formatDate(publication.readyAt ?? publication.createdAt)}
                </p>
                {publication.failureCode && <small>{publication.failureCode}</small>}
              </div>
              <div className="publicationActions">
                <span className={`jobStatus ${publication.status}`}>{publication.status}</span>
                {!isActive && publication.status === "ready" && (
                  <form action={rollbackPublicationAction}>
                    <input name="websiteId" type="hidden" value={editor.website.id} />
                    <input name="publicationId" type="hidden" value={publication.id} />
                    <PendingSubmit className="inlineButton" pendingLabel="Rolling back…">
                      Roll back
                    </PendingSubmit>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {editor.publications.length === 0 && <p className="empty">No publications yet.</p>}
      </section>
    </>
  );
}

function SectionCommand({
  action,
  websiteId,
  sectionId,
  revision,
  label,
  direction,
  danger = false,
}: {
  action: (formData: FormData) => Promise<void>;
  websiteId: string;
  sectionId: string;
  revision: string;
  label: string;
  direction?: "up" | "down";
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input name="websiteId" type="hidden" value={websiteId} />
      <input name="sectionId" type="hidden" value={sectionId} />
      <input name="websiteDraftRevision" type="hidden" value={revision} />
      {direction && <input name="direction" type="hidden" value={direction} />}
      <PendingSubmit
        className={danger ? "textButton dangerButton" : "textButton"}
        pendingLabel="Working…"
      >
        {label}
      </PendingSubmit>
    </form>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function websitePublicUrl(hostname: string): string {
  const renderer = new URL(dashboardConfig.FACTORY_RENDERER_PUBLIC_URL);
  if (hostname.endsWith(".localhost") || hostname === "localhost") {
    return `${renderer.protocol}//${hostname}${renderer.port ? `:${renderer.port}` : ""}/`;
  }
  return `https://${hostname}/`;
}
