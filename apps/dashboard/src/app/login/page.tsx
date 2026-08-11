import { LoginForm } from "./login-form";
import { cookies } from "next/headers";
import { dashboardConfig } from "@/server/config";
import { UI_LOCALE_COOKIE, uiLocale } from "@/server/ui-locale";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; reset?: string }>;
}) {
  const query = await searchParams;
  const locale = uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  return (
    <main className="loginShell" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <LoginForm
        authMode={dashboardConfig.FACTORY_AUTH_MODE}
        locale={locale}
        reset={query.reset === "1"}
        {...(query.error ? { error: query.error } : {})}
        {...(query.next ? { next: query.next } : {})}
      />
    </main>
  );
}
