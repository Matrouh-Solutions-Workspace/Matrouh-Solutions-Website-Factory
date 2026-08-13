import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(process.cwd(), "src/app");

describe("shared website editor studio", () => {
  it("gives administrators and clients the same editing workspace", async () => {
    const [adminEditor, clientEditor] = await Promise.all([
      readFile(resolve(appRoot, "websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "account/websites/[id]/page.tsx"), "utf8"),
    ]);

    for (const editor of [adminEditor, clientEditor]) {
      expect(editor).toContain("editorStudioPage");
      expect(editor).toContain("editorStudioWorkspace");
      expect(editor).toContain("editorStudioSidebar");
      expect(editor).toContain("editorStudioInspector");
      expect(editor).toContain("EditorPreviewPane");
      expect(editor).toContain("EditorSaveStatus");
    }
  });

  it("keeps administrative ownership and destructive controls admin-only", async () => {
    const [adminEditor, clientEditor] = await Promise.all([
      readFile(resolve(appRoot, "websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "account/websites/[id]/page.tsx"), "utf8"),
    ]);

    expect(adminEditor).toContain("createWebsiteClaimLinkAction");
    expect(adminEditor).toContain("deleteWebsiteAction");
    expect(clientEditor).not.toContain("createWebsiteClaimLinkAction");
    expect(clientEditor).not.toContain("deleteWebsiteAction");
  });

  it("keeps the inspector out of the global main gutter and contains claim controls", async () => {
    const [adminEditor, clientEditor, styles] = await Promise.all([
      readFile(resolve(appRoot, "websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "account/websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "styles.css"), "utf8"),
    ]);

    expect(adminEditor).toContain('<div className="editorStudioInspector">');
    expect(clientEditor).toContain('<div className="editorStudioInspector">');
    expect(adminEditor).toContain("claimLinkManager");
    expect(styles).toContain(".editorStudioInspector > .claimLinkManager");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) auto");
  });

  it("contains locale controls without overlapping the live preview", async () => {
    const [adminEditor, clientEditor, styles] = await Promise.all([
      readFile(resolve(appRoot, "websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "account/websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "styles.css"), "utf8"),
    ]);

    expect(adminEditor.match(/editorLocaleManager/g)).toHaveLength(2);
    expect(clientEditor).toContain("editorLocaleManager");
    expect(styles).toContain("> form.localeManager:not(.claimLinkManager)");
    expect(styles).toContain("> section.editorLocaleManager");
  });

  it("stacks the design configuration inside the inspector without crushing headings", async () => {
    const styles = await readFile(resolve(appRoot, "styles.css"), "utf8");

    expect(styles).toContain("> .editorConfiguration:has(.themeStudio)");
    expect(styles).toContain(".editorStudioInspector .themeStudioLayout");
    expect(styles).toContain("overflow-wrap: normal");
    expect(styles).toContain("word-break: normal");
  });

  it("gives the nested content editor its own responsive workspace", async () => {
    const [adminEditor, styles] = await Promise.all([
      readFile(resolve(appRoot, "websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "styles.css"), "utf8"),
    ]);

    expect(adminEditor).toContain("data-editor-step={setupStep}");
    expect(styles).toContain('data-editor-step="content"');
    expect(styles).toContain("grid-template-columns: minmax(190px, 220px) minmax(0, 1fr)");
    expect(styles).toContain(".draggableSection");
    expect(styles).toContain("@media (min-width: 1880px)");
    expect(styles).toContain("@media (max-width: 1050px)");
  });

  it("surfaces autosave globally and supports the familiar keyboard save shortcut", async () => {
    const [form, studio] = await Promise.all([
      readFile(resolve(appRoot, "draft-editor-form.tsx"), "utf8"),
      readFile(resolve(appRoot, "editor-studio.tsx"), "utf8"),
    ]);

    expect(form).toContain("DRAFT_SAVE_STATUS_EVENT");
    expect(form).toContain('event.key.toLowerCase() !== "s"');
    expect(form).toContain("form.requestSubmit()");
    expect(studio).toContain("All changes saved");
    expect(studio).toContain("Changes need attention");
  });

  it("renders secure draft snapshots and refreshes them after successful autosaves", async () => {
    const [actions, adminEditor, clientEditor, form, studio] = await Promise.all([
      readFile(resolve(appRoot, "actions.ts"), "utf8"),
      readFile(resolve(appRoot, "websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "account/websites/[id]/page.tsx"), "utf8"),
      readFile(resolve(appRoot, "draft-editor-form.tsx"), "utf8"),
      readFile(resolve(appRoot, "editor-studio.tsx"), "utf8"),
    ]);

    expect(actions).toContain("export async function createWebsiteDraftPreviewAction");
    expect(actions).toContain('new URL("/preview/"');
    expect(actions).toContain("return gatewayUrl.toString()");
    for (const editor of [adminEditor, clientEditor]) {
      expect(editor).toContain("createPreview={createWebsiteDraftPreviewAction}");
      expect(editor).toContain("websiteId={editor.website.id}");
    }
    expect(form).toContain("DRAFT_CONTENT_SAVED_EVENT");
    expect(studio).toContain('DRAFT_CONTENT_SAVED_EVENT = "factory:draft-content-saved"');
    expect(studio).toContain("Preparing draft preview");
    expect(studio).toContain("createPreviewRef.current(websiteId)");
    expect(studio).not.toContain("Published website");
  });

  it("provides desktop, tablet, and mobile preview controls", async () => {
    const [studio, styles] = await Promise.all([
      readFile(resolve(appRoot, "editor-studio.tsx"), "utf8"),
      readFile(resolve(appRoot, "styles.css"), "utf8"),
    ]);

    expect(studio).toContain('type PreviewViewport = "desktop" | "tablet" | "mobile"');
    expect(studio).toContain("editorViewportSwitch");
    expect(studio).toContain("editorPreviewRefresh");
    expect(studio).toContain("function PreviewIcon");
    expect(studio).toContain("PREVIEW_DIMENSIONS");
    expect(studio).toContain("desktop: { width: 1440, height: 900 }");
    expect(studio).toContain("ResizeObserver");
    expect(studio).toContain("editorPreviewFrame");
    expect(studio).toContain('<PreviewIcon name="refresh" />');
    expect(studio).toContain('<PreviewIcon name="open" />');
    expect(studio).toContain("<iframe");
    expect(styles).toContain(".editorPreviewActions svg");
    expect(styles).toContain("@media (min-width: 1660px)");
    expect(styles).toContain("grid-template-columns: 220px minmax(440px, 560px)");
    expect(styles).toContain(".editorPreviewFrame iframe");
  });
});
