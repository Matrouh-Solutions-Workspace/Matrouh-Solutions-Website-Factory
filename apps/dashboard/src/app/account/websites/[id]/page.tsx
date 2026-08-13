import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  addWebsiteLocaleAction,
  createWebsiteDraftPreviewAction,
  previewWebsiteAction,
  publishClientWebsiteUpdateAction,
  updateWebsiteDefaultLocaleAction,
  updateSeoDraftAction,
  updateSectionDraftAction,
  updateWebsiteBrandingAction,
  updateWebsiteIdentityAction,
  updateWebsiteLogoAction,
  updateNavigationNodeAction,
} from "@/app/actions";
import { ClientPublicationAction } from "@/app/client-publication-action";
import { CoordinatePickerFields, StructuredListField } from "@/app/structured-list-field";
import { DraftEditorForm } from "@/app/draft-editor-form";
import { DocumentImportField } from "@/app/document-import-field";
import { EditorPreviewPane, EditorSaveStatus } from "@/app/editor-studio";
import { MediaPicker } from "@/app/media-picker";
import { PendingSubmit } from "@/app/pending-submit";
import { dashboardConfig } from "@/server/config";
import { loadClientWebsiteEditor } from "@/server/editor";
import { UI_LOCALE_COOKIE, uiLocale } from "@/server/ui-locale";

export const dynamic = "force-dynamic";

export default async function ClientWebsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const editor = await loadClientWebsiteEditor(id);
  if (!editor) notFound();

  const locale = uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  const copy = locale === "ar" ? arabic : english;
  const menuMode = editor.templateFeatures.includes("menu-management");
  const availableLocales = editor.supportedLocales.filter(
    (supportedLocale) => !editor.website.locales.includes(supportedLocale),
  );

  return (
    <div
      className={`clientWebsiteManager editorStudioPage editorStudioClient${menuMode ? " clientMenuManager" : ""}`}
    >
      <header className="websiteEditorHeader">
        <div>
          <p className="eyebrow">{menuMode ? copy.menuManager : copy.websiteManager}</p>
          <h1>{editor.website.name}</h1>
          <p className="sub">
            {editor.website.pendingUpdate ? copy.pendingChanges : copy.autosaveChanges}
          </p>
        </div>
        <div className="headerActions">
          <ClientPublicationAction
            action={publishClientWebsiteUpdateAction}
            jobStatus={editor.latestPublishJob?.status ?? null}
            locale={locale}
            pendingUpdate={editor.website.pendingUpdate}
            websiteId={editor.website.id}
          />
          <form action={previewWebsiteAction}>
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <PendingSubmit className="secondaryButton" pendingLabel={copy.preparingPreview}>
              {copy.previewDraft}
            </PendingSubmit>
          </form>
          {editor.website.hostname ? (
            <a
              className="buttonLink secondaryButton"
              href={publicWebsiteUrl(editor.website.hostname)}
              rel="noreferrer"
              target="_blank"
            >
              {copy.viewLive}
            </a>
          ) : null}
          <a className="textLink editorBackLink" href="/account">
            {locale === "ar" ? "مواقعي ←" : "← My websites"}
          </a>
        </div>
        <EditorSaveStatus locale={locale} />
      </header>

      <section className="editorMetaBar websiteEditorMeta" aria-label={copy.websiteStatus}>
        <div>
          <span>{copy.status}</span>
          <strong className="status">
            {editor.website.pendingUpdate ? copy.pendingUpdate : editor.website.status}
          </strong>
        </div>
        <div>
          <span>{copy.domain}</span>
          <strong>{editor.website.hostname ?? copy.domainPending}</strong>
        </div>
        <div>
          <span>{copy.draftRevision}</span>
          <strong>{editor.website.draftRevision}</strong>
        </div>
      </section>

      <div className="editorStudioWorkspace">
        <aside className="editorStudioSidebar">
          <div className="editorStudioSidebarIntro">
            <span>{menuMode ? copy.menuWorkspace : copy.websiteManager}</span>
            <strong>{copy.chooseWhatToEdit}</strong>
          </div>
          <nav aria-label={menuMode ? copy.menuWorkspace : copy.websiteManager}>
            <a href="#client-identity">
              <span>01</span>
              {copy.websiteIdentity}
            </a>
            <a href="#client-branding">
              <span>02</span>
              {copy.branding}
            </a>
            {menuMode ? (
              <a href="#menu-languages">
                <span>03</span>
                {copy.languages}
              </a>
            ) : null}
            <a href="#client-content">
              <span>{menuMode ? "04" : "03"}</span>
              {menuMode ? copy.categoriesAndItems : copy.content}
            </a>
            {editor.navigation.length > 0 ? (
              <a href="#client-navigation">
                <span>{menuMode ? "05" : "04"}</span>
                {copy.navigation}
              </a>
            ) : null}
          </nav>
          <div className="editorStudioTip">
            <span aria-hidden="true">⌘</span>
            <p>{copy.editorTip}</p>
          </div>
        </aside>

        <div className="editorStudioInspector">
          <DraftEditorForm
            action={updateWebsiteIdentityAction}
            className="panel editForm"
            id="client-identity"
          >
            <input name="websiteId" type="hidden" value={editor.website.id} />
            <div className="panelHead">
              <div>
                <p className="eyebrow">{copy.websiteIdentity}</p>
                <h2>{copy.dashboardTitle}</h2>
              </div>
            </div>
            <label>
              {copy.websiteTitle}
              <input defaultValue={editor.website.name} maxLength={200} name="name" required />
            </label>
          </DraftEditorForm>

          <section className="panel editForm" id="client-branding">
            <div className="panelHead">
              <div>
                <p className="eyebrow">{copy.branding}</p>
                <h2>{copy.brandingTitle}</h2>
                <p className="sub">{copy.brandingDescription}</p>
              </div>
            </div>
            <div className="inlineUploadGrid">
              <DraftEditorForm action={updateWebsiteBrandingAction}>
                <input name="websiteId" type="hidden" value={editor.website.id} />
                <input name="updatesWhiteLabel" type="hidden" value="1" />
                <MediaPicker
                  assets={editor.mediaAssets}
                  defaultValue={editor.website.faviconAssetId ?? ""}
                  label={copy.favicon}
                  name="faviconAssetId"
                  noneLabel={copy.factoryDefault}
                  purpose="favicon"
                  websiteId={editor.website.id}
                />
                {menuMode ? (
                  <label className="checkboxLine">
                    <input
                      defaultChecked={!editor.website.whiteLabelEnabled}
                      name="showWatermark"
                      type="checkbox"
                      value="on"
                    />
                    {copy.showWatermark}
                  </label>
                ) : null}
              </DraftEditorForm>
              <DraftEditorForm action={updateWebsiteLogoAction}>
                <input name="websiteId" type="hidden" value={editor.website.id} />
                <MediaPicker
                  assets={editor.mediaAssets}
                  defaultValue={settingsValue(editor.settings?.content, "logoMediaId") ?? ""}
                  label={copy.customLogo}
                  name="logoMediaId"
                  noneLabel={copy.templateDefault}
                  purpose="logo"
                  websiteId={editor.website.id}
                />
              </DraftEditorForm>
            </div>
          </section>

          {menuMode ? (
            <section className="panel localeManager editorLocaleManager" id="menu-languages">
              <div className="panelHead">
                <div>
                  <p className="eyebrow">{copy.languages}</p>
                  <h2>{copy.menuLanguage}</h2>
                  <p className="sub">{copy.menuLanguageDescription}</p>
                </div>
                <strong>
                  {editor.website.locales.map((value) => localeName(value, locale)).join(" + ")}
                </strong>
              </div>
              <div className="menuLanguageActions">
                <form action={addWebsiteLocaleAction}>
                  <input name="websiteId" type="hidden" value={editor.website.id} />
                  <input
                    name="websiteDraftRevision"
                    type="hidden"
                    value={editor.website.draftRevision}
                  />
                  <label>
                    {copy.addLanguage}
                    <select disabled={availableLocales.length === 0} name="locale" required>
                      <option value="">
                        {availableLocales.length === 0
                          ? copy.allLanguagesEnabled
                          : copy.chooseLanguage}
                      </option>
                      {availableLocales.map((value) => (
                        <option key={value} value={value}>
                          {localeName(value, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <PendingSubmit
                    disabled={availableLocales.length === 0}
                    pendingLabel={copy.addingLanguage}
                  >
                    {copy.addLanguage}
                  </PendingSubmit>
                </form>
                {editor.website.locales.length > 1 ? (
                  <form action={updateWebsiteDefaultLocaleAction}>
                    <input name="websiteId" type="hidden" value={editor.website.id} />
                    <input
                      name="websiteDraftRevision"
                      type="hidden"
                      value={editor.website.draftRevision}
                    />
                    <label>
                      {copy.defaultLanguage}
                      <select
                        defaultValue={editor.website.defaultLocale}
                        name="defaultLocale"
                        required
                      >
                        {editor.website.locales.map((value) => (
                          <option key={value} value={value}>
                            {localeName(value, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <PendingSubmit pendingLabel={copy.updatingLanguage}>
                      {copy.setDefaultLanguage}
                    </PendingSubmit>
                  </form>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="clientContentWorkspace" id="client-content">
            <div className="panelHead">
              <div>
                <p className="eyebrow">{copy.content}</p>
                <h2>{menuMode ? copy.editMenu : copy.editPages}</h2>
                <p className="sub">{copy.autosaveDescription}</p>
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
                      <DraftEditorForm
                        action={updateSectionDraftAction}
                        className="sectionContentForm"
                      >
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
                            ) : field.control === "document-import" ? (
                              <DocumentImportField
                                fieldName={field.name}
                                initialJson={field.value}
                                key={field.name}
                                label={field.label}
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
                                    <option value="true">{copy.yes}</option>
                                    <option value="false">{copy.no}</option>
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
                            {copy.contentJson}
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
                <DraftEditorForm action={updateSeoDraftAction} className="sectionSeoForm">
                  <input name="websiteId" type="hidden" value={editor.website.id} />
                  <input name="pageId" type="hidden" value={page.id} />
                  <input
                    name="websiteDraftRevision"
                    type="hidden"
                    value={editor.website.draftRevision}
                  />
                  <div className="sectionEditorHead">
                    <div>
                      <strong>{copy.searchVisibility}</strong>
                      <p>{copy.searchVisibilityDescription}</p>
                    </div>
                  </div>
                  <label>
                    {copy.searchTitle}
                    <input defaultValue={page.seo.title} maxLength={200} name="title" />
                  </label>
                  <label>
                    {copy.searchDescription}
                    <textarea
                      defaultValue={page.seo.description}
                      maxLength={500}
                      name="description"
                      rows={3}
                    />
                  </label>
                  <label>
                    {copy.keywords}
                    <input defaultValue={page.seo.keywords.join(", ")} name="keywords" />
                  </label>
                  <div className="checkboxGroup">
                    <label className="checkboxLine">
                      <input defaultChecked={page.seo.index} name="index" type="checkbox" />
                      {copy.allowIndexing}
                    </label>
                    <label className="checkboxLine">
                      <input defaultChecked={page.seo.follow} name="follow" type="checkbox" />
                      {copy.allowFollowing}
                    </label>
                  </div>
                </DraftEditorForm>
              </section>
            ))}
          </section>

          {editor.navigation.length > 0 ? (
            <section className="panel followPanel" id="client-navigation">
              <div className="panelHead">
                <div>
                  <p className="eyebrow">{copy.navigation}</p>
                  <h2>{copy.navigationLabels}</h2>
                  <p className="sub">{copy.navigationDescription}</p>
                </div>
                <span>{copy.menuCount.replace("{count}", String(editor.navigation.length))}</span>
              </div>
              {editor.navigation.map((navigation) => {
                const navigationLocales = navigation.locale
                  ? [navigation.locale]
                  : editor.website.locales;
                return (
                  <div className="navigationEditor" key={navigation.id}>
                    <strong>
                      {navigation.title}
                      {navigation.locale ? ` — ${localeName(navigation.locale, locale)}` : ""}
                    </strong>
                    <div className="navigationNodeGrid">
                      {navigation.nodes.map((node) => (
                        <DraftEditorForm
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
                            <legend>{copy.navigationLabel}</legend>
                            {navigationLocales.map((navigationLocale) => (
                              <label key={navigationLocale}>
                                {localeName(navigationLocale, locale)}
                                <input
                                  defaultValue={node.labels[navigationLocale] ?? ""}
                                  dir={navigationLocale === "ar" ? "rtl" : "ltr"}
                                  lang={navigationLocale}
                                  name={`label:${navigationLocale}`}
                                  required
                                />
                              </label>
                            ))}
                          </fieldset>
                        </DraftEditorForm>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}
        </div>

        <EditorPreviewPane
          createPreview={createWebsiteDraftPreviewAction}
          locale={locale}
          title={editor.website.name}
          websiteId={editor.website.id}
        />
      </div>
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

function settingsValue(content: string | undefined, key: string): string | null {
  if (!content) return null;
  try {
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const value = (parsed as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function localeName(value: string, dashboardLocale: "ar" | "en"): string {
  if (value === "ar") return dashboardLocale === "ar" ? "العربية" : "Arabic";
  if (value === "en") return dashboardLocale === "ar" ? "الإنجليزية" : "English";
  return value;
}

const english = {
  websiteManager: "Website manager",
  menuManager: "Digital menu manager",
  menuWorkspace: "Menu workspace",
  chooseWhatToEdit: "Choose what to edit",
  editorTip: "Changes save automatically. Press Ctrl + S to save the focused section now.",
  languages: "Languages",
  categoriesAndItems: "Categories & items",
  previewAndPublish: "Preview & publish",
  previewDraft: "Preview draft",
  preparingPreview: "Preparing preview…",
  showWatermark: "Show the Matrouh Solutions watermark",
  menuLanguage: "Menu languages",
  menuLanguageDescription: "Use English, Arabic, or enable both for a bilingual menu.",
  addLanguage: "Add language",
  allLanguagesEnabled: "All supported languages are enabled",
  chooseLanguage: "Choose language",
  addingLanguage: "Adding language…",
  defaultLanguage: "Default public language",
  updatingLanguage: "Updating language…",
  setDefaultLanguage: "Set default language",
  editMenu: "Build your menu",
  pendingChanges: "Your changes are saved and waiting to be published.",
  autosaveChanges: "Changes save automatically and will be marked for publishing.",
  viewLive: "View live website",
  websiteStatus: "Website status",
  status: "Status",
  pendingUpdate: "pending update",
  domain: "Domain",
  domainPending: "Domain pending",
  draftRevision: "Draft revision",
  websiteIdentity: "Website identity",
  dashboardTitle: "Dashboard title",
  websiteTitle: "Website title",
  branding: "Branding",
  brandingTitle: "Logo and favicon",
  brandingDescription:
    "Choose an existing image or upload a new one from your website media folder.",
  favicon: "Favicon",
  factoryDefault: "Use the Factory default",
  customLogo: "Custom logo",
  templateDefault: "Use the template logo",
  content: "Content",
  editPages: "Edit your pages",
  autosaveDescription:
    "Every change is autosaved. Select existing images or upload a new one from the image picker.",
  yes: "Yes",
  no: "No",
  contentJson: "Content JSON",
  searchVisibility: "Search visibility",
  searchVisibilityDescription: "Safe search and social settings for this page.",
  searchTitle: "Search title",
  searchDescription: "Search description",
  keywords: "Keywords",
  allowIndexing: "Allow search indexing",
  allowFollowing: "Allow search engines to follow links",
  navigation: "Navigation",
  navigationLabels: "Navigation labels",
  navigationDescription: "Navigation labels are saved automatically for every website language.",
  menuCount: "{count} menus",
  navigationLabel: "Navigation label",
} as const;

const arabic: Record<keyof typeof english, string> = {
  websiteManager: "إدارة الموقع",
  menuManager: "إدارة القائمة الرقمية",
  menuWorkspace: "مساحة إدارة القائمة",
  chooseWhatToEdit: "اختر ما تريد تعديله",
  editorTip: "تُحفظ التغييرات تلقائياً. اضغط Ctrl + S لحفظ القسم النشط فوراً.",
  languages: "اللغات",
  categoriesAndItems: "الأقسام والأصناف",
  previewAndPublish: "المعاينة والنشر",
  previewDraft: "معاينة المسودة",
  preparingPreview: "جارٍ تجهيز المعاينة…",
  showWatermark: "إظهار علامة مطروح سوليوشنز",
  menuLanguage: "لغات القائمة",
  menuLanguageDescription: "استخدم الإنجليزية أو العربية أو فعّل اللغتين لقائمة ثنائية اللغة.",
  addLanguage: "إضافة لغة",
  allLanguagesEnabled: "كل اللغات المدعومة مفعّلة",
  chooseLanguage: "اختر اللغة",
  addingLanguage: "جارٍ إضافة اللغة…",
  defaultLanguage: "لغة العرض الافتراضية",
  updatingLanguage: "جارٍ تحديث اللغة…",
  setDefaultLanguage: "تعيين اللغة الافتراضية",
  editMenu: "أنشئ قائمتك",
  pendingChanges: "تم حفظ تغييراتك وهي بانتظار النشر.",
  autosaveChanges: "تُحفظ التغييرات تلقائيًا وتُعلَّم للنشر.",
  viewLive: "فتح الموقع",
  websiteStatus: "حالة الموقع",
  status: "الحالة",
  pendingUpdate: "تحديث قيد الانتظار",
  domain: "النطاق",
  domainPending: "النطاق قيد التجهيز",
  draftRevision: "مراجعة المسودة",
  websiteIdentity: "هوية الموقع",
  dashboardTitle: "عنوان لوحة التحكم",
  websiteTitle: "عنوان الموقع",
  branding: "الهوية البصرية",
  brandingTitle: "الشعار والأيقونة",
  brandingDescription: "اختر صورة موجودة أو ارفع صورة جديدة من مجلد وسائط موقعك.",
  favicon: "أيقونة الموقع",
  factoryDefault: "استخدم الإعداد الافتراضي",
  customLogo: "شعار مخصص",
  templateDefault: "استخدم شعار القالب",
  content: "المحتوى",
  editPages: "تعديل صفحاتك",
  autosaveDescription:
    "يتم حفظ كل تغيير تلقائيًا. اختر الصور الموجودة أو ارفع صورة جديدة من منتقي الصور.",
  yes: "نعم",
  no: "لا",
  contentJson: "محتوى JSON",
  searchVisibility: "الظهور في البحث",
  searchVisibilityDescription: "إعدادات آمنة للبحث والمشاركة لهذه الصفحة.",
  searchTitle: "عنوان البحث",
  searchDescription: "وصف البحث",
  keywords: "الكلمات المفتاحية",
  allowIndexing: "السماح بالفهرسة",
  allowFollowing: "السماح لمحركات البحث باتباع الروابط",
  navigation: "التنقل",
  navigationLabels: "تسميات التنقل",
  navigationDescription: "تُحفظ تسميات التنقل تلقائيًا لكل لغة في الموقع.",
  menuCount: "{count} قوائم",
  navigationLabel: "تسمية التنقل",
};
