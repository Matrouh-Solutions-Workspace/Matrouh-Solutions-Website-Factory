import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cairo } from "next/font/google";
import { DashboardShell } from "@/app/dashboard-shell";
import { UI_LOCALE_COOKIE, uiLocale } from "@/server/ui-locale";
import "./styles.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: { default: "Website Factory", template: "%s · Website Factory" },
  description: "Matrouh Solutions multi-tenant website control panel",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const locale = uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  return (
    <html dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} suppressHydrationWarning>
      <body className={cairo.variable}>
        <DashboardShell locale={locale}>{children}</DashboardShell>
      </body>
    </html>
  );
}
