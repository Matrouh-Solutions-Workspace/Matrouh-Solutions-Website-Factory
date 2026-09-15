"use client";

import { useRef } from "react";
import {
  deleteEcommerceProductAction,
  updateEcommerceProductAction,
} from "@/app/ecommerce/actions";
import { EcommerceColorPicker } from "@/app/ecommerce-color-picker";

interface EcommerceProductLike {
  readonly id: string;
  readonly attributesJson: unknown;
  readonly translations: readonly { locale: string; [key: string]: unknown }[];
}

function value(
  rows: readonly { locale: string; [key: string]: unknown }[],
  locale: string,
  field: string,
) {
  const row = rows.find((item) => item.locale === locale) ?? rows[0];
  return typeof row?.[field] === "string" ? row[field] : "";
}

export function EcommerceProductActions({
  product,
  storeId,
}: {
  readonly product: EcommerceProductLike;
  readonly storeId: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const attributes =
    product.attributesJson && typeof product.attributesJson === "object"
      ? (product.attributesJson as { colors?: unknown })
      : {};
  const colors = Array.isArray(attributes.colors)
    ? attributes.colors.filter((color): color is string => typeof color === "string")
    : [];
  return (
    <div className="commerceProductActions">
      <button onClick={() => dialog.current?.showModal()} type="button">
        Edit
      </button>
      <form
        action={deleteEcommerceProductAction}
        onSubmit={(event) => {
          if (!window.confirm("Delete this product?")) event.preventDefault();
        }}
      >
        <input name="storeId" type="hidden" value={storeId} />
        <input name="productId" type="hidden" value={product.id} />
        <button className="commerceDeleteButton" type="submit">
          Delete
        </button>
      </form>
      <dialog className="commerceProductDialog" ref={dialog}>
        <form action={updateEcommerceProductAction} className="settingsForm commerceCompactForm">
          <input name="storeId" type="hidden" value={storeId} />
          <input name="productId" type="hidden" value={product.id} />
          <div className="commerceDialogHeader">
            <h3>Edit product</h3>
            <button onClick={() => dialog.current?.close()} type="button">
              ×
            </button>
          </div>
          <label>
            English name
            <input
              defaultValue={value(product.translations, "en", "name")}
              name="nameEn"
              required
            />
          </label>
          <label>
            Arabic name
            <input
              defaultValue={value(product.translations, "ar", "name")}
              dir="rtl"
              name="nameAr"
            />
          </label>
          <label>
            Short description (English)
            <textarea
              defaultValue={value(product.translations, "en", "shortDescription")}
              name="shortDescriptionEn"
              rows={2}
            />
          </label>
          <label>
            Short description (Arabic)
            <textarea
              defaultValue={value(product.translations, "ar", "shortDescription")}
              dir="rtl"
              name="shortDescriptionAr"
              rows={2}
            />
          </label>
          <label>
            Full description (English)
            <textarea
              defaultValue={value(product.translations, "en", "description")}
              name="descriptionEn"
              rows={3}
            />
          </label>
          <label>
            Full description (Arabic)
            <textarea
              defaultValue={value(product.translations, "ar", "description")}
              dir="rtl"
              name="descriptionAr"
              rows={3}
            />
          </label>
          <label>
            Product colors
            <EcommerceColorPicker defaultValue={colors} name="colors" />
          </label>
          <button type="submit">Save product</button>
        </form>
      </dialog>
    </div>
  );
}
