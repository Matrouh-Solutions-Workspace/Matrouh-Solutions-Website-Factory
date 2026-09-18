"use client";

import { createContext, useContext, useId, useMemo, useState, type ReactNode } from "react";

type WebsiteLanguage = {
  readonly code: string;
  readonly label: string;
  readonly shortLabel: string;
};

type WebsiteLanguageContextValue = {
  readonly activeLocale: string;
  readonly panelId: (locale: string) => string;
  readonly selectLocale: (locale: string) => void;
  readonly tabId: (locale: string) => string;
};

const WebsiteLanguageContext = createContext<WebsiteLanguageContextValue | null>(null);

export function WebsiteLanguageWorkspace({
  children,
  defaultLocale,
  languages,
}: {
  readonly children: ReactNode;
  readonly defaultLocale: string;
  readonly languages: readonly WebsiteLanguage[];
}) {
  const generatedId = useId().replaceAll(":", "");
  const initialLocale = languages.some((language) => language.code === defaultLocale)
    ? defaultLocale
    : (languages[0]?.code ?? defaultLocale);
  const [activeLocale, setActiveLocale] = useState(initialLocale);
  const languageCodes = useMemo(
    () => new Set(languages.map((language) => language.code)),
    [languages],
  );
  const value = useMemo<WebsiteLanguageContextValue>(
    () => ({
      activeLocale,
      panelId: (locale) => `website-language-panel-${generatedId}-${locale}`,
      selectLocale: (locale) => {
        if (languageCodes.has(locale)) setActiveLocale(locale);
      },
      tabId: (locale) => `website-language-tab-${generatedId}-${locale}`,
    }),
    [activeLocale, generatedId, languageCodes],
  );

  return (
    <WebsiteLanguageContext.Provider value={value}>{children}</WebsiteLanguageContext.Provider>
  );
}

export function WebsiteLanguageToolbar({
  activeLabel,
  defaultLabel,
  defaultLocale,
  description,
  eyebrow,
  languages,
  title,
}: {
  readonly activeLabel: string;
  readonly defaultLabel: string;
  readonly defaultLocale: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly languages: readonly WebsiteLanguage[];
  readonly title: string;
}) {
  const context = useWebsiteLanguageContext();
  const activeLanguage =
    languages.find((language) => language.code === context.activeLocale) ?? languages[0];

  return (
    <section className="websiteLanguageToolbar" aria-label={title}>
      <div className="websiteLanguageToolbarIntro">
        <span className="websiteLanguageGlyph" aria-hidden="true">
          <b>A</b>
          <i>ع</i>
        </span>
        <span>
          <small>{eyebrow}</small>
          <strong>{title}</strong>
          <p>{description}</p>
        </span>
      </div>
      <div className="websiteLanguageTabs" role="tablist" aria-label={title}>
        {languages.map((language) => {
          const selected = context.activeLocale === language.code;
          return (
            <button
              aria-controls={context.panelId(language.code)}
              aria-selected={selected}
              className={selected ? "active" : undefined}
              id={context.tabId(language.code)}
              key={language.code}
              onClick={() => context.selectLocale(language.code)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span className="websiteLanguageCode">{language.shortLabel}</span>
              <span>
                <strong>{language.label}</strong>
                {language.code === defaultLocale ? <small>{defaultLabel}</small> : null}
              </span>
              <span className="websiteLanguageCheck" aria-hidden="true">
                {selected ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="websiteLanguageCurrent" aria-live="polite">
        <span aria-hidden="true" />
        {activeLabel.replace("{language}", activeLanguage?.label ?? context.activeLocale)}
      </p>
    </section>
  );
}

export function WebsiteLocalePanel({
  children,
  locale,
  panel = false,
}: {
  readonly children: ReactNode;
  readonly locale: string;
  readonly panel?: boolean;
}) {
  const context = useWebsiteLanguageContext();
  const active = context.activeLocale === locale;

  return (
    <div
      aria-labelledby={panel ? context.tabId(locale) : undefined}
      className={panel ? "websiteLocalePanel" : "websiteLocaleFields"}
      hidden={!active}
      id={panel ? context.panelId(locale) : undefined}
      lang={locale}
      role={panel ? "tabpanel" : undefined}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      {children}
    </div>
  );
}

function useWebsiteLanguageContext(): WebsiteLanguageContextValue {
  const context = useContext(WebsiteLanguageContext);
  if (!context) throw new Error("Website language controls must be inside their workspace.");
  return context;
}
