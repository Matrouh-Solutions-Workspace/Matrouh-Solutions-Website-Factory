import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("commerce storefront templates", () => {
  it("renders distinct fashion, trade hardware, and PC-component experiences", async () => {
    const source = await readFile(resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"), "utf8");

    expect(source).toContain('key.includes("pc")');
    expect(source).toContain('key.includes("hardware")');
    expect(source).toContain('shopTheme--${kind}');
    expect(source).toContain("searchHardware");
    expect(source).toContain("searchFashion");
    expect(source).toContain("compatibility");
    expect(source).toContain("shopSwatches");
    expect(source).toContain("categoryPcIcon");
    expect(source).toContain("Compatibility-first builds");
  });

  it("supports product search, visible filters, sorting, RTL, dark mode, and accessible manual sliders", async () => {
    const source = await readFile(resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"), "utf8");
    const styles = await readFile(resolve(process.cwd(), "public/commerce-storefront.css"), "utf8");

    expect(source).toContain('role="search"');
    expect(source).toContain("activeFilters");
    expect(source).toContain('sort === "price-low"');
    expect(source).toContain('dir={rtl ? "rtl" : "ltr"}');
    expect(source).toContain('data-theme={theme}');
    expect(source).toContain('aria-roledescription="carousel"');
    expect(source).not.toContain("setInterval(");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain('[dir="rtl"] .shopFilters');
    expect(styles).toContain(".shopTheme--pc");
    expect(styles).toContain("var(--font-tajawal)");
    expect(styles).toContain("var(--font-cairo)");
    expect(styles).toContain(".commercePublicRoot > main");
    expect(styles).toContain(".shopHeader { position: sticky; top: 0; z-index: 40; display: block; margin: 0;");
    expect(styles).toContain("@media (max-width: 980px)");
    expect(styles).toContain(".shopNav.isOpen { display: grid; }");
  });

  it("uses one WhatsApp order flow without advertising an online gateway", async () => {
    const source = await readFile(resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"), "utf8");

    expect(source).toContain("buildWhatsAppOrderUrl");
    expect(source).toContain("Send complete order on WhatsApp");
    expect(source).toContain("إرسال الطلب كاملاً عبر واتساب");
    expect(source).toContain('className="shopPrimaryButton shopWhatsAppButton"');
    expect(source).not.toContain('name="paymentMethodId"');
    expect(source).not.toContain('copy.payment}</label>');
  });
});
