import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("commerce storefront templates", () => {
  it("renders distinct fashion, trade hardware, and PC-component experiences", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"),
      "utf8",
    );

    expect(source).toContain('key.includes("pc")');
    expect(source).toContain('key.includes("hardware")');
    expect(source).toContain("shopTheme--${kind}");
    expect(source).toContain("searchHardware");
    expect(source).toContain("searchFashion");
    expect(source).toContain("compatibility");
    expect(source).toContain("shopSwatches");
    expect(source).toContain("categoryPcIcon");
    expect(source).toContain("Compatibility-first builds");
  });

  it("supports product search, visible filters, sorting, RTL, dark mode, and accessible manual sliders", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"),
      "utf8",
    );
    const styles = await readFile(resolve(process.cwd(), "public/commerce-storefront.css"), "utf8");

    expect(source).toContain('role="search"');
    expect(source).toContain("activeFilters");
    expect(source).toContain('sort === "price-low"');
    expect(source).toContain('dir={rtl ? "rtl" : "ltr"}');
    expect(source).toContain("data-theme={theme}");
    expect(source).toContain('aria-roledescription="carousel"');
    expect(source).not.toContain("setInterval(");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain('[dir="rtl"] .shopFilters');
    expect(styles).toContain(".shopTheme--pc");
    expect(styles).toContain("var(--font-tajawal)");
    expect(styles).toContain("var(--font-cairo)");
    expect(styles).toContain(".commercePublicRoot > main");
    expect(styles).toMatch(
      /\.shopHeader\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*z-index:\s*40;[^}]*display:\s*block;[^}]*margin:\s*0;/s,
    );
    expect(styles).toContain("@media (max-width: 980px)");
    expect(styles).toMatch(/\.shopNav\.isOpen\s*\{\s*display:\s*grid;\s*\}/s);
  });

  it("gives the hardware hero the PC hero's immersive responsive composition", async () => {
    const styles = await readFile(resolve(process.cwd(), "public/commerce-storefront.css"), "utf8");

    expect(styles).toMatch(
      /\.shopTheme--hardware \.shopHero\s*\{[^}]*display:\s*block;[^}]*border-radius:\s*24px;/s,
    );
    expect(styles).toMatch(
      /\.shopTheme--hardware \.shopHeroCopy\s*\{[^}]*position:\s*relative;[^}]*width:\s*min\(53%, 720px\);/s,
    );
    expect(styles).toMatch(
      /\.shopTheme--hardware \.shopHeroVisual\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s,
    );
    expect(styles).toContain('.shopTheme--hardware[dir="rtl"] .shopHeroCopy');
    expect(styles).toContain("@media (max-width: 560px)");
  });

  it("positions fashion as a flexible everyday clothing store with a product-first hero", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"),
      "utf8",
    );
    const preview = await readFile(
      resolve(process.cwd(), "src/app/commerce-template-preview/[rendererKey]/page.tsx"),
      "utf8",
    );
    const styles = await readFile(resolve(process.cwd(), "public/commerce-storefront.css"), "utf8");

    expect(source).toContain("/commerce-heroes/fashion-everyday-v2.jpg");
    expect(source).toContain('className="shopFashionQuickLinks"');
    expect(source).toContain("Wear what feels like you.");
    expect(source).toContain("البس ما يشبهك.");
    expect(source).toContain("basics stores, streetwear shops, and family retailers");
    expect(preview).toContain('["الجديد", "حريمي", "رجالي", "أطفال", "أحذية", "إكسسوارات"]');
    expect(preview).toContain("Everyday cotton tee");
    expect(styles).toContain("Fashion storefront V2");
    expect(styles).toMatch(
      /\.shopTheme--fashion \.shopHeroVisual\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s,
    );
    expect(styles).toContain(".shopFashionHeroPills");
    expect(styles).toContain(".shopFashionQuickLinks");
  });

  it("uses one WhatsApp order flow without advertising an online gateway", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"),
      "utf8",
    );

    expect(source).toContain("buildWhatsAppOrderUrl");
    expect(source).toContain("Send complete order on WhatsApp");
    expect(source).toContain("إرسال الطلب كاملاً عبر واتساب");
    expect(source).toContain('className="shopPrimaryButton shopWhatsAppButton"');
    expect(source).not.toContain('name="paymentMethodId"');
    expect(source).not.toContain("copy.payment}</label>");
  });
});
