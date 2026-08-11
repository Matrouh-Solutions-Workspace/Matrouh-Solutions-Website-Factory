export const UI_LOCALE_COOKIE = "factory_ui_locale";

export type UiLocale = "ar" | "en";

export function uiLocale(value: string | null | undefined): UiLocale {
  return value === "en" ? "en" : "ar";
}
