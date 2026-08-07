export const supportedWebsiteLocales = ["en", "ar"] as const;

export type WebsiteLocale = (typeof supportedWebsiteLocales)[number];
export type WebsiteLanguageMode = WebsiteLocale | "both";

export interface WebsiteLanguageSelection {
  defaultLocale: WebsiteLocale;
  locales: readonly WebsiteLocale[];
}

export function websiteLanguageSelection(
  mode: string,
  requestedDefault: string,
): WebsiteLanguageSelection | null {
  if (mode === "en" || mode === "ar") {
    return { defaultLocale: mode, locales: [mode] };
  }
  if (mode !== "both") return null;

  const defaultLocale: WebsiteLocale = requestedDefault === "ar" ? "ar" : "en";
  return {
    defaultLocale,
    locales: [defaultLocale, defaultLocale === "en" ? "ar" : "en"],
  };
}

export function isSupportedWebsiteLocale(value: string): value is WebsiteLocale {
  return supportedWebsiteLocales.some((locale) => locale === value);
}
