"use client";

import { useActionState } from "react";
import type { TemplateCatalogItem } from "@/server/template-catalog";
import { initialTemplateCatalogSettingsState } from "./catalog-action-state";
import { updateTemplateCatalogSettingsAction } from "./catalog-actions";

export function TemplateCatalogSettingsForm({
  template,
  showHeader = true,
}: {
  readonly template: TemplateCatalogItem;
  readonly showHeader?: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateTemplateCatalogSettingsAction,
    initialTemplateCatalogSettingsState,
  );
  const settings = template.catalog;
  return (
    <section className="templateCatalogSettings">
      <form action={action} className="templateCatalogSettingsForm">
        <input name="templateId" type="hidden" value={template.templateId} />
        {showHeader ? (
          <div className="templateCatalogSettingsHead">
            <div>
              <span className="templateCatalogSettingsEyebrow">Public listing controls</span>
              <strong>Visibility &amp; listing</strong>
              <small>Changes appear on the public /templates page.</small>
            </div>
            <span className={settings.visible ? "status active" : "status failed"}>
              {settings.visible ? "Visible" : "Hidden"}
            </span>
          </div>
        ) : null}
        <div className="templateCatalogQuickGrid">
          <label className="templateCatalogSwitch templateCatalogVisibilityControl">
            <input defaultChecked={settings.visible} name="visible" type="checkbox" value="yes" />
            <span>Show publicly</span>
          </label>
          <label>
            Sort order
            <input defaultValue={settings.sortOrder} name="sortOrder" required type="number" />
          </label>
          <label className="templateCatalogSwitch">
            <input defaultChecked={settings.featured} name="featured" type="checkbox" value="yes" />
            <span>Featured package</span>
          </label>
          <button disabled={pending} type="submit">
            {pending ? "Saving catalog…" : "Save listing"}
          </button>
        </div>
        <details className="templateCatalogAdvancedSettings">
          <summary>
            <span>Advanced listing content</span>
            <small>Badges, buttons, descriptions and package highlights</small>
          </summary>
          <div className="templateCatalogSettingsGrid">
            <label>
              Badge (English)
              <input
                defaultValue={settings.badge}
                maxLength={80}
                name="badge"
                placeholder="Most popular"
              />
            </label>
            <label>
              Badge (Arabic)
              <input
                dir="rtl"
                defaultValue={settings.badgeAr}
                maxLength={80}
                name="badgeAr"
                placeholder="الأكثر طلباً"
              />
            </label>
            <label>
              Button label (English)
              <input
                defaultValue={settings.ctaLabel}
                maxLength={80}
                name="ctaLabel"
                placeholder="Request this template"
              />
            </label>
            <label>
              Button label (Arabic)
              <input
                dir="rtl"
                defaultValue={settings.ctaLabelAr}
                maxLength={80}
                name="ctaLabelAr"
                placeholder="اطلب هذه الباقة"
              />
            </label>
            <label className="templateCatalogWideField">
              Button destination
              <input
                defaultValue={settings.ctaHref}
                name="ctaHref"
                placeholder="https://wa.me/201284289997 or another HTTPS link"
              />
            </label>
            <label className="templateCatalogWideField">
              Sales description (English)
              <textarea
                defaultValue={settings.salesDescription}
                maxLength={600}
                name="salesDescription"
                placeholder="Short public description of what this package includes."
                rows={3}
              />
            </label>
            <label className="templateCatalogWideField">
              Sales description (Arabic)
              <textarea
                dir="rtl"
                defaultValue={settings.salesDescriptionAr}
                maxLength={600}
                name="salesDescriptionAr"
                placeholder="وصف مختصر لما تتضمنه الباقة."
                rows={3}
              />
            </label>
            <label className="templateCatalogWideField">
              Package highlights (English)
              <textarea
                defaultValue={settings.highlights.join("\n")}
                name="highlights"
                placeholder={"Responsive design\nArabic and English\nHosting and support"}
                rows={4}
              />
              <small>One benefit per line, up to 8.</small>
            </label>
            <label className="templateCatalogWideField">
              Package highlights (Arabic)
              <textarea
                dir="rtl"
                defaultValue={settings.highlightsAr.join("\n")}
                name="highlightsAr"
                placeholder={"تصميم متجاوب\nالعربية والإنجليزية\nالاستضافة والدعم"}
                rows={4}
              />
              <small>ميزة واحدة في كل سطر، بحد أقصى 8.</small>
            </label>
          </div>
        </details>
        {state.message ? (
          <p aria-live="polite" className={`formNotice formNotice--${state.status}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
