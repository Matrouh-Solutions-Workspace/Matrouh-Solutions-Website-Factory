"use client";

import { useActionState, useId } from "react";
import type { TemplateCatalogItem } from "@/server/template-catalog";
import { initialTemplateCatalogSettingsState } from "./catalog-action-state";
import { updateTemplateCategoryAction } from "./catalog-actions";

export function TemplateCategoryForm({
  template,
  categorySuggestions,
  categoryArSuggestions,
}: {
  readonly template: TemplateCatalogItem;
  readonly categorySuggestions: readonly string[];
  readonly categoryArSuggestions: readonly string[];
}) {
  const [state, action, pending] = useActionState(
    updateTemplateCategoryAction,
    initialTemplateCatalogSettingsState,
  );
  const suggestionId = useId();
  const suggestionArId = useId();

  return (
    <details className="templateCategoryEditor">
      <summary>
        <span>
          <small>Template category</small>
          <strong>{template.catalog.category}</strong>
        </span>
        <span className="templateCategoryEditLabel">Change</span>
      </summary>
      <form action={action} className="templateCategoryForm">
        <input name="templateId" type="hidden" value={template.templateId} />
        <label>
          Category (English)
          <input
            defaultValue={template.catalog.category}
            list={suggestionId}
            maxLength={80}
            name="category"
            placeholder="Portfolio"
            required
          />
          <datalist id={suggestionId}>
            {categorySuggestions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>
        <label>
          Category (Arabic)
          <input
            defaultValue={template.catalog.categoryAr}
            dir="rtl"
            list={suggestionArId}
            maxLength={80}
            name="categoryAr"
            placeholder="التصنيف بالعربية"
          />
          <datalist id={suggestionArId}>
            {categoryArSuggestions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>
        <button disabled={pending} type="submit">
          {pending ? "Saving…" : "Save category"}
        </button>
        {state.message ? (
          <p aria-live="polite" className={`formNotice formNotice--${state.status}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </details>
  );
}
