"use client";

import { useState } from "react";

type Locale = "en" | "ar";

export function EcommerceLocalizedFields({
  values = {},
  namesOnly = false,
}: {
  readonly values?: Partial<Record<"nameEn" | "nameAr" | "shortDescriptionEn" | "shortDescriptionAr" | "descriptionEn" | "descriptionAr", string>>;
  readonly namesOnly?: boolean;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  const field = (name: keyof typeof values, label: string, multiline = false) => (
    <label hidden={locale !== (name.endsWith("Ar") ? "ar" : "en")}>
      {label}
      {multiline ? <textarea defaultValue={values[name]} dir={name.endsWith("Ar") ? "rtl" : undefined} name={name} rows={name.startsWith("description") ? 4 : 2} /> : <input defaultValue={values[name]} dir={name.endsWith("Ar") ? "rtl" : undefined} name={name} required={name === "nameEn"} />}
    </label>
  );
  return <div className="ecommerceLocalizedFields"><div className="ecommerceLocaleTabs" role="tablist"><button aria-selected={locale === "en"} className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} role="tab" type="button">English</button><button aria-selected={locale === "ar"} className={locale === "ar" ? "active" : ""} onClick={() => setLocale("ar")} role="tab" type="button">العربية</button></div>{field("nameEn", "Name")} {field("nameAr", "Name")} {!namesOnly && <>{field("shortDescriptionEn", "Short description", true)} {field("shortDescriptionAr", "Short description", true)} {field("descriptionEn", "Full description", true)} {field("descriptionAr", "Full description", true)}</>}</div>;
}
