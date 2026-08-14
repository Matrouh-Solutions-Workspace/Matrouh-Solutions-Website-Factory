import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "@fontsource/tajawal/900.css";
import { DashboardShell } from "@/app/dashboard-shell";
import { UI_LOCALE_COOKIE, uiLocale } from "@/server/ui-locale";
import "./styles.css";

export const metadata: Metadata = {
  title: { default: "Website Factory", template: "%s · Website Factory" },
  description: "Matrouh Solutions multi-tenant website control panel",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  if (requestHeaders.has("x-factory-site-host")) {
    return (
      <html lang="und">
        <body>{children}</body>
      </html>
    );
  }
  const locale = uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  return (
    <html dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} suppressHydrationWarning>
      <body>
        <DashboardShell locale={locale}>{children}</DashboardShell>
      </body>
    </html>
  );
}
