import { LoginForm } from "./login-form";
import { dashboardConfig } from "@/server/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; reset?: string; locale?: string }>;
}) {
  const query = await searchParams;
  const locale = query.locale === "en" ? "en" : "ar";
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
