import { describe, expect, it } from "vitest";
import { localeLinks, localizedPageRoute, textDirection } from "../src/server/locale-navigation";

const bilingualSite = {
  locales: [{ locale: "en" }, { locale: "ar-EG" }],
  pages: [
    { id: "home-en", pageTypeId: "home", locale: "en" },
    { id: "home-ar", pageTypeId: "home", locale: "ar-EG" },
    { id: "contact-en", pageTypeId: "contact", locale: "en" },
    { id: "contact-ar", pageTypeId: "contact", locale: "ar-EG" },
  ],
  routes: [
    { pathname: "/", pageId: "home-en", locale: "en" },
    { pathname: "/ar-EG", pageId: "home-ar", locale: "ar-EG" },
    { pathname: "/contact", pageId: "contact-en", locale: "en" },
    { pathname: "/ar-EG/contact", pageId: "contact-ar", locale: "ar-EG" },
  ],
} as const;

describe("public locale navigation", () => {
  it("links the equivalent page in every authored locale", () => {
    expect(localeLinks(bilingualSite, "/contact")).toEqual([
      { locale: "en", href: "/contact", current: true },
      { locale: "ar-EG", href: "/ar-EG/contact", current: false },
    ]);
  });

  it("does not fall back to an unrelated page when a translation is missing", () => {
    expect(
      localeLinks(
        { ...bilingualSite, pages: bilingualSite.pages.filter((page) => page.id !== "contact-ar") },
        "/contact",
      ),
    ).toEqual([{ locale: "en", href: "/contact", current: true }]);
  });

  it("selects RTL direction for Arabic-family locales", () => {
    expect(textDirection("ar-EG")).toBe("rtl");
    expect(textDirection("en")).toBe("ltr");
  });

  it("resolves a shared navigation page to its localized page type", () => {
    expect(localizedPageRoute(bilingualSite, "contact-en", "ar-EG")).toBe("/ar-EG/contact");
    expect(localizedPageRoute(bilingualSite, "contact-en", "en")).toBe("/contact");
  });
});
