import { notFound } from "next/navigation";
import {
  addSectionDraftAction,
  addWebsiteLocaleAction,
  createWebsiteClaimLinkAction,
  deleteWebsiteAction,
  deleteSectionDraftAction,
  duplicateSectionDraftAction,
  moveSectionDraftAction,
  previewWebsiteAction,
  retryPublicationJobAction,
  setWebsiteAvailabilityAction,
  toggleWebsitePublicationAction,
  uploadMediaAction,
  rollbackPublicationAction,
  updatePageDraftAction,
  updateNavigationNodeAction,
  updateSectionDraftAction,
  updateSeoDraftAction,
  updateThemeDraftAction,
  updateWebsiteIdentityAction,
  updateWebsiteBrandingAction,
  updateWebsiteLogoAction,
  updateWebsiteDefaultLocaleAction,
  updateWebsiteSettingsDraftAction,
  upgradeWebsiteTemplateAction,
} from "@/app/actions";
import { ConfirmSubmit } from "@/app/confirm-submit";
import { DraftEditorForm } from "@/app/draft-editor-form";
import { DraggableSection } from "@/app/draggable-section";
import { PendingSubmit } from "@/app/pending-submit";
import { PublicationStatusRefresh } from "@/app/publication-status-refresh";
import { DraftSetupSteps, draftSetupStep } from "@/app/draft-setup-steps";
import { CoordinatePickerFields, StructuredListField } from "@/app/structured-list-field";
import { ThemeLiveEditor } from "@/app/theme-live-editor";
import { MediaPicker } from "@/app/media-picker";
import { loadWebsiteEditor } from "@/server/editor";
import { dashboardConfig } from "@/server/config";
import { canRetryPublicationJob, isActivePublicationJob } from "@/server/publication-jobs";
import { dashboardLocale } from "@/server/dashboard-locale";

export const dynamic = "force-dynamic";

export default async function WebsiteEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ claimLink?: string; setupStep?: string }>;
}) {
  const { id } = await params;
  const { claimLink, setupStep: requestedSetupStep } = await searchParams;
  const [editor, locale] = await Promise.all([loadWebsiteEditor(id), dashboardLocale()]);
  if (!editor) notFound();
  const setupStep = draftSetupStep(requestedSetupStep);
  const publishPending = isActivePublicationJob(editor.latestPublishJob?.status);
  const availableLocales = editor.supportedLocales.filter(
    (locale) => !editor.website.locales.includes(locale),
  );

  return (
    <div className="websiteEditorPage">
      <PublicationStatusRefresh active={publishPending && setupStep === "review"} />
      <header className="websiteEditorHeader">
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
          <form action={toggleWebsitePublicationAction}>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <PendingSubmit
              disabled={
                publishPending ||
                (editor.website.status === "published" && !editor.website.pendingUpdate)
              }
              pendingLabel={editor.website.pendingUpdate ? "Publishing update…" : "Publishing…"}
            >
              {publishPending
                ? "Publish queued"
                : editor.website.pendingUpdate
                  ? "Publish update"
                  : editor.website.status === "published"
                    ? "Published"
                    : "Publish"}
            </PendingSubmit>
          </form>
          {editor.website.status === "published" && (
            <form action={setWebsiteAvailabilityAction}>
              <input name="websiteId" type="hidden" value={editor.website.id} />
              <input name="status" type="hidden" value="unpublished" />
              <ConfirmSubmit
                className="secondaryButton dangerButton"
                confirmation={`Unpublish “${editor.website.name}”? The current live version will stop receiving public traffic.`}
                pendingLabel="Unpublishing…"
              >
                Unpublish
              </ConfirmSubmit>
            </form>
          )}
          <form action={deleteWebsiteAction}>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <ConfirmSubmit
              className="secondaryButton dangerButton websiteDeleteAction"
              confirmation={`Delete “${editor.website.name}” permanently? Its domains, drafts, previews, and publication history will also be deleted. This cannot be undone.`}
              pendingLabel="Deleting…"
            >
              Delete website
            </ConfirmSubmit>
          </form>
          <a className="textLink editorBackLink" href="/websites">
            ← All websites
          </a>
        </div>
      </header>

      <section aria-label="Website details" className="editorMetaBar websiteEditorMeta">
        <div>
          <span>Status</span>
          <strong className="status">
            {editor.website.pendingUpdate ? "pending update" : editor.website.status}
          </strong>
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

      {editor.latestPublishJob && (
        <section className={`publishJobNotice ${editor.latestPublishJob.status}`} role="status">
          <div>
            <strong>Publish job: {editor.latestPublishJob.status.replace("_", " ")}</strong>
            <span>
              Attempt {editor.latestPublishJob.attemptCount}/{editor.latestPublishJob.maxAttempts}
            </span>
          </div>
          {canRetryPublicationJob(editor.latestPublishJob.status) && (
            <form action={retryPublicationJobAction}>
              <input name="jobId" type="hidden" value={editor.latestPublishJob.id} />
              <PendingSubmit pendingLabel="Queueing retry...">Retry publish</PendingSubmit>
            </form>
          )}
        </section>
      )}

      <DraftSetupSteps current={setupStep} websiteId={editor.website.id} />

      <form
        action={updateWebsiteIdentityAction}
        className="panel editForm"
        hidden={setupStep !== "identity"}
      >
        <div className="panelHead">
          <div>
            <p className="eyebrow">Website identity</p>
            <h2>Website title</h2>
          </div>
        </div>
        <input name="websiteId" type="hidden" value={editor.website.id} />
        <label>
          Dashboard title
          <input defaultValue={editor.website.name} maxLength={200} name="name" required />
        </label>
        <div className="formFooter">
          <PendingSubmit pendingLabel="Saving…">Save title</PendingSubmit>
        </div>
      </form>

      {!editor.website.clientId && (
        <form
          action={createWebsiteClaimLinkAction}
          className="panel localeManager"
          hidden={setupStep !== "identity"}
        >
          <div>
            <p className="eyebrow">Ownership</p>
            <h2>Send a claim link</h2>
            <p>The owner can register or sign in, review the website, and claim it.</p>
            {claimLink ? <output className="claimLink">{claimLink}</output> : null}
          </div>
          <input name="websiteId" type="hidden" value={editor.website.id} />
          <label>
            Owner email (optional)
            <input name="intendedEmail" type="email" />
          </label>
          <PendingSubmit pendingLabel="Creating…">Create claim link</PendingSubmit>
        </form>
      )}

      <form
        action={updateWebsiteBrandingAction}
        className="panel editForm"
        hidden={setupStep !== "identity"}
      >
        <div className="panelHead">
          <div>
            <p className="eyebrow">Branding</p>
            <h2>Favicon and white label</h2>
          </div>
        </div>
        <input name="websiteId" type="hidden" value={editor.website.id} />
        <MediaPicker
          assets={editor.mediaAssets}
          defaultValue={editor.website.faviconAssetId ?? ""}
          label="Favicon image"
          name="faviconAssetId"
          noneLabel="Use the Factory default"
          purpose="favicon"
          websiteId={editor.website.id}
        />
        <p className="formNotice">
          Recommended: square PNG or WebP, 512 × 512 px, with a transparent background.
        </p>
        <label className="checkboxLine">
          <input
            defaultChecked={editor.website.whiteLabelEnabled}
            name="whiteLabelEnabled"
            type="checkbox"
          />
          White label this website (hide the Matrouh Solutions watermark)
        </label>
        <div className="formFooter">
          <PendingSubmit pendingLabel="Saving…">Save branding</PendingSubmit>
        </div>
      </form>

      <div className="panel editForm" hidden={setupStep !== "design"}>
        <div className="panelHead">
          <div>
            <p className="eyebrow">Direct uploads</p>
            <h2>Favicon and custom logo</h2>
          </div>
        </div>
        <p className="formNotice">
          Choose visually from this website&apos;s media folder or upload a new image in the picker.
        </p>
        <div className="inlineUploadGrid">
          <form action={updateWebsiteBrandingAction}>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <input
              name="whiteLabelEnabled"
              type="hidden"
              value={editor.website.whiteLabelEnabled ? "on" : ""}
            />
            <MediaPicker
              assets={editor.mediaAssets}
              defaultValue={editor.website.faviconAssetId ?? ""}
              label="Favicon"
              name="faviconAssetId"
              noneLabel="Use the Factory default"
              purpose="favicon"
              websiteId={editor.website.id}
            />
            <PendingSubmit pendingLabel="Saving…">Save favicon</PendingSubmit>
          </form>
          <form action={updateWebsiteLogoAction}>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <MediaPicker
              assets={editor.mediaAssets}
              defaultValue={settingsValue(editor.settings?.content, "logoMediaId") ?? ""}
              label="Custom logo"
              name="logoMediaId"
              noneLabel="Use the template logo"
              purpose="logo"
              websiteId={editor.website.id}
            />
            <PendingSubmit pendingLabel="Saving…">Save logo</PendingSubmit>
          </form>
        </div>
      </div>

      <form
        action={uploadMediaAction}
        className="panel localeManager"
        hidden={setupStep !== "design"}
      >
        <div>
          <p className="eyebrow">Content media</p>
          <h2>Upload an image</h2>
          <p>
            It will appear in image selectors after processing and is filed under this domain
            automatically.
          </p>
        </div>
        <input name="websiteId" type="hidden" value={editor.website.id} />
        <label>
          Image
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            name="file"
            required
            type="file"
          />
        </label>
        <PendingSubmit pendingLabel="Uploading…">Upload image</PendingSubmit>
      </form>

      <form
        action={addWebsiteLocaleAction}
        className="panel localeManager"
        hidden={setupStep !== "identity"}
      >
        <div>
          <p className="eyebrow">Languages</p>
          <h2>Website locales</h2>
          <p className="formNotice">
            This template supports:{" "}
            {editor.supportedLocales.map((locale) => localeName(locale)).join(", ")}.
          </p>
          <p>
            {editor.website.locales.join(", ")} · default {editor.website.defaultLocale}
          </p>
        </div>
        <input name="websiteId" type="hidden" value={editor.website.id} />
        <input name="websiteDraftRevision" type="hidden" value={editor.website.draftRevision} />
        <label>
          Add locale
          <select disabled={availableLocales.length === 0} name="locale" required>
            <option value="">
              {availableLocales.length === 0
                ? "All supported languages are enabled"
                : "Choose language"}
            </option>
            {availableLocales.map((locale) => (
              <option key={locale} value={locale}>
                {localeName(locale)}
              </option>
            ))}
          </select>
        </label>
        <PendingSubmit disabled={availableLocales.length === 0} pendingLabel="Creating locale...">
          Add language
        </PendingSubmit>
      </form>

      {editor.website.locales.length > 1 && (
        <form
          action={updateWebsiteDefaultLocaleAction}
          className="panel localeManager"
          hidden={setupStep !== "identity"}
        >
          <div>
            <p className="eyebrow">Primary language</p>
            <h2>Default locale</h2>
            <p>Changing this updates public URL prefixes after the next publish.</p>
          </div>
          <input name="websiteId" type="hidden" value={editor.website.id} />
          <input name="websiteDraftRevision" type="hidden" value={editor.website.draftRevision} />
          <label>
            Default language
            <select defaultValue={editor.website.defaultLocale} name="defaultLocale" required>
              {editor.website.locales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale === "ar" ? "Arabic" : locale === "en" ? "English" : locale}
                </option>
              ))}
            </select>
          </label>
          <PendingSubmit pendingLabel="Updating default...">Set default</PendingSubmit>
        </form>
      )}

      {editor.availableTemplateVersions.length > 0 && (
        <form
          action={upgradeWebsiteTemplateAction}
          className="panel upgradeNotice"
          hidden={setupStep !== "identity"}
        >
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

      <section className="workspaceGrid editorConfiguration" hidden={setupStep !== "design"}>
        {editor.settings && (
          <form
            action={updateWebsiteSettingsDraftAction}
            className="panel editForm codeEditorPanel"
          >
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
              <textarea
                name="contentJson"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                defaultValue={editor.settings.content}
                rows={12}
                spellCheck={false}
              />
            </label>
            <div className="formFooter">
              <PendingSubmit pendingLabel="Saving settings...">Save settings</PendingSubmit>
            </div>
          </form>
        )}
        {editor.theme && (
          <ThemeLiveEditor
            action={updateThemeDraftAction}
            expectedRevision={editor.theme.revision}
            initialTokens={editor.theme.tokens}
            templateId={editor.website.templateId}
            templateVersion={editor.website.templateVersion}
            themeId={editor.theme.id}
            websiteDraftRevision={editor.website.draftRevision}
            websiteId={editor.website.id}
          />
        )}
      </section>

      {editor.navigation.length > 0 && (
        <section className="panel followPanel" hidden={setupStep !== "content"}>
          <div className="panelHead">
            <div>
              <p className="eyebrow">Menus</p>
              <h2>Navigation labels</h2>
            </div>
            <span>{editor.navigation.length} menus</span>
          </div>
          {editor.navigation.map((navigation) => {
            const navigationLocales = navigation.locale
              ? [navigation.locale]
              : editor.website.locales;
            return (
              <div className="navigationEditor" key={navigation.id}>
                <strong>
                  {navigation.title}
                  {navigation.locale ? ` — ${localeName(navigation.locale)}` : ""}
                </strong>
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
                      <fieldset className="localizedNavigationLabels">
                        <legend>
                          {node.kind} label{navigationLocales.length === 1 ? "" : "s"}
                        </legend>
                        {navigationLocales.map((locale) => (
                          <label key={locale}>
                            {localeName(locale)}
                            <input
                              defaultValue={node.labels[locale] ?? ""}
                              dir={locale === "ar" ? "rtl" : "ltr"}
                              lang={locale}
                              name={`label:${locale}`}
                              required
                            />
                          </label>
                        ))}
                      </fieldset>
                      <PendingSubmit className="inlineButton" pendingLabel="Saving...">
                        Save
                      </PendingSubmit>
                    </form>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="editorShell" hidden={setupStep !== "content"}>
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

              <DraftEditorForm action={updatePageDraftAction} className="editForm pageMetaForm">
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
              </DraftEditorForm>

              <details className="pageSeoEditor">
                <summary>Search and social settings</summary>
                <form action={updateSeoDraftAction} className="seoEditor">
                  <input name="websiteId" type="hidden" value={editor.website.id} />
                  <input name="pageId" type="hidden" value={page.id} />
                  <input
                    name="websiteDraftRevision"
                    type="hidden"
                    value={editor.website.draftRevision}
                  />
                  <div className="seoGrid">
                    <div className="editFormFields">
                      <label>
                        Search title
                        <input defaultValue={page.seo.title} maxLength={200} name="title" />
                      </label>
                      <label>
                        Description
                        <textarea
                          defaultValue={page.seo.description}
                          maxLength={500}
                          name="description"
                          rows={4}
                        />
                      </label>
                      <label>
                        Keywords
                        <span className="fieldHint">Comma-separated, up to 30</span>
                        <input defaultValue={page.seo.keywords.join(", ")} name="keywords" />
                      </label>
                      <div className="checkRow">
                        <label>
                          <input defaultChecked={page.seo.index} name="index" type="checkbox" />{" "}
                          Allow indexing
                        </label>
                        <label>
                          <input defaultChecked={page.seo.follow} name="follow" type="checkbox" />{" "}
                          Follow links
                        </label>
                      </div>
                      <PendingSubmit pendingLabel="Saving SEO…">Save page SEO</PendingSubmit>
                    </div>
                    <div className="searchPreview">
                      <small>Search preview</small>
                      <strong>{page.seo.title || page.title}</strong>
                      <span>
                        {editor.website.hostname ?? "example.com"}/
                        {page.slug === "/" ? "" : page.slug}
                      </span>
                      <p>{page.seo.description || `${editor.website.name} — ${page.title}`}</p>
                    </div>
                  </div>
                </form>
              </details>

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
                        </div>
                        {section.fields.length > 0 ? (
                          section.fields.map((field) =>
                            field.name === "longitude" ? null : field.name === "latitude" ? (
                              <CoordinatePickerFields
                                key="location-coordinates"
                                latitude={field.value}
                                longitude={
                                  section.fields.find((item) => item.name === "longitude")?.value ??
                                  "0"
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

      <section className="panel followPanel" hidden={setupStep !== "review"}>
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
                  {formatDate(publication.readyAt ?? publication.createdAt, locale)}
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
    </div>
  );
}

function settingsValue(content: string | undefined, key: string): string | undefined {
  if (!content) return undefined;
  try {
    const value = JSON.parse(content) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const selected = (value as Record<string, unknown>)[key];
    return typeof selected === "string" ? selected : undefined;
  } catch {
    return undefined;
  }
}

function localeName(locale: string): string {
  if (locale === "ar") return "العربية";
  if (locale === "en") return "English";
  return locale;
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

function formatDate(value: Date, locale: "ar" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function websitePublicUrl(hostname: string): string {
  const dashboard = new URL(dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL);
  if (hostname.endsWith(".localhost") || hostname === "localhost") {
    return `${dashboard.protocol}//${hostname}${dashboard.port ? `:${dashboard.port}` : ""}/`;
  }
  return `https://${hostname}/`;
}
