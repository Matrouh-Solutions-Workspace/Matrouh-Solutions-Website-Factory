import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Cairo, Tajawal } from "next/font/google";
import { DashboardShell } from "@/app/dashboard-shell";
import { UI_LOCALE_COOKIE, uiLocale } from "@/server/ui-locale";
import "./styles.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-tajawal",
  weight: ["400", "500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: { default: "Website Factory", template: "%s · Website Factory" },
  description: "Matrouh Solutions multi-tenant website control panel",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  if (requestHeaders.has("x-factory-site-host")) {
    return (
      <html className={`${tajawal.variable} ${cairo.variable}`} lang="und">
        <body>{children}</body>
      </html>
    );
  }
  const locale = uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  return (
    <html dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} suppressHydrationWarning>
      <body className={cairo.variable}>
        <DashboardShell locale={locale}>{children}</DashboardShell>
      </body>
    </html>
  );
}
