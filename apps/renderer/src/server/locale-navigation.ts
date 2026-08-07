interface LocaleNavigationSource {
  readonly locales: readonly { readonly locale: string }[];
  readonly routes: readonly {
    readonly pathname: string;
    readonly pageId: string;
    readonly locale: string;
  }[];
  readonly pages: readonly {
    readonly id: string;
    readonly pageTypeId: string;
    readonly locale: string;
  }[];
}

export interface LocaleLink {
  readonly locale: string;
  readonly href: string;
  readonly current: boolean;
}

const rtlLanguages = new Set(["ar", "ckb", "dv", "fa", "he", "ku", "ps", "ur"]);

export function textDirection(locale: string): "ltr" | "rtl" {
  return rtlLanguages.has(locale.toLowerCase().split("-")[0] ?? "") ? "rtl" : "ltr";
}

export function localeLinks(
  snapshot: LocaleNavigationSource,
  pathname: string,
): readonly LocaleLink[] {
  const currentRoute = snapshot.routes.find((route) => route.pathname === pathname);
  if (!currentRoute) return [];
  const currentPage = snapshot.pages.find(
    (page) => page.id === currentRoute.pageId && page.locale === currentRoute.locale,
  );
  if (!currentPage) return [];

  return snapshot.locales.flatMap(({ locale }) => {
    const page = snapshot.pages.find(
      (candidate) => candidate.locale === locale && candidate.pageTypeId === currentPage.pageTypeId,
    );
    if (!page) return [];
    const route = snapshot.routes.find(
      (candidate) => candidate.locale === locale && candidate.pageId === page.id,
    );
    return route ? [{ locale, href: route.pathname, current: locale === currentRoute.locale }] : [];
  });
}

export function localizedPageRoute(
  snapshot: LocaleNavigationSource,
  pageId: string,
  locale: string,
): string | null {
  const direct = snapshot.routes.find(
    (route) => route.pageId === pageId && route.locale === locale,
  );
  if (direct) return direct.pathname;
  const sourcePage = snapshot.pages.find((page) => page.id === pageId);
  if (!sourcePage) return null;
  const localizedPage = snapshot.pages.find(
    (page) => page.locale === locale && page.pageTypeId === sourcePage.pageTypeId,
  );
  if (!localizedPage) return null;
  return (
    snapshot.routes.find((route) => route.pageId === localizedPage.id && route.locale === locale)
      ?.pathname ?? null
  );
}
